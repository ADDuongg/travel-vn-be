import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job } from 'bullmq';
import { User, UserDocument } from 'src/user/schema/user.schema';
import { NotificationService } from './notification.service';
import { EmailService } from './email/email.service';
import { NOTIFICATION_QUEUE, NotificationType } from './notification.constants';
import { guideRegisteredTemplate } from './email/templates/guide-registered';
import { guideVerifiedTemplate } from './email/templates/guide-verified';
import { EnvService } from 'src/env/env.service';

interface GuideRegisteredJobData {
  guideId: string;
  userId: string;
  userName: string;
  userEmail?: string;
}

interface GuideVerifiedJobData {
  guideId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  isVerified: boolean;
}

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
    private readonly envService: EnvService,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {
    super();
  }

  async process(job: Job<GuideRegisteredJobData | GuideVerifiedJobData>) {
    this.logger.log(`Processing job ${job.name} [${job.id}]`);

    switch (job.name) {
      case 'guide-registered':
        await this.handleGuideRegistered(job.data as GuideRegisteredJobData);
        break;
      case 'guide-verified':
        await this.handleGuideVerified(job.data as GuideVerifiedJobData);
        break;
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleGuideRegistered(data: GuideRegisteredJobData) {
    const adminUsers = await this.userModel
      .find({ roles: 'admin', isActive: true })
      .select('_id email fullName')
      .lean();

    // In-app notifications for all admins
    if (adminUsers.length > 0) {
      const notifications = adminUsers.map((admin) => ({
        recipientId: String(admin._id),
        type: NotificationType.GUIDE_REGISTRATION_PENDING,
        title: 'Đơn đăng ký HDV mới',
        message: `${data.userName || 'Người dùng'} vừa đăng ký làm hướng dẫn viên, cần duyệt.`,
        metadata: { guideId: data.guideId, userId: data.userId },
        link: `/admin/tour-guides/${data.guideId}`,
      }));

      try {
        await this.notificationService.createMany(notifications);
        this.logger.log(
          `Created ${notifications.length} in-app notifications for admins`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to create in-app notifications: ${error.message}`,
        );
      }
    }

    // Email to admin(s)
    const adminEmail = this.envService.get('ADMIN_EMAIL');
    const emailRecipients = new Set<string>();
    if (adminEmail) emailRecipients.add(adminEmail);
    for (const admin of adminUsers) {
      if (admin.email) emailRecipients.add(admin.email);
    }

    const template = guideRegisteredTemplate({
      guideName: data.userName || 'Không rõ tên',
      guideId: data.guideId,
    });

    for (const email of emailRecipients) {
      try {
        await this.emailService.send(email, template.subject, template.html);
      } catch (error) {
        this.logger.error(`Failed to send email to ${email}: ${error.message}`);
      }
    }
  }

  private async handleGuideVerified(data: GuideVerifiedJobData) {
    const type = data.isVerified
      ? NotificationType.GUIDE_VERIFIED
      : NotificationType.GUIDE_REJECTED;

    const title = data.isVerified
      ? 'Hồ sơ HDV đã được duyệt!'
      : 'Hồ sơ HDV chưa được duyệt';

    const message = data.isVerified
      ? 'Chúc mừng! Hồ sơ hướng dẫn viên của bạn đã được admin phê duyệt. Bạn đã có thể nhận tour.'
      : 'Hồ sơ hướng dẫn viên của bạn chưa được duyệt. Vui lòng liên hệ admin để biết thêm chi tiết.';

    // In-app notification for the user
    try {
      await this.notificationService.create({
        recipientId: data.userId,
        type,
        title,
        message,
        metadata: { guideId: data.guideId },
        link: '/guide/my-profile',
      });
      this.logger.log(`Created in-app notification for user ${data.userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to create in-app notification: ${error.message}`,
      );
    }

    // Email to user
    if (data.userEmail) {
      const template = guideVerifiedTemplate({
        guideName: data.userName || 'Bạn',
        isVerified: data.isVerified,
      });

      try {
        await this.emailService.send(
          data.userEmail,
          template.subject,
          template.html,
        );
      } catch (error) {
        this.logger.error(`Failed to send email to user: ${error.message}`);
      }
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.name} [${job.id}] failed (attempt ${job.attemptsMade}/${job.opts.attempts}): ${error.message}`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.name} [${job.id}] completed`);
  }
}
