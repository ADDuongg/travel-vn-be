/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job } from 'bullmq';
import { User, UserDocument } from 'src/user/schema/user.schema';
import { NotificationService } from './notification.service';
import { NOTIFICATION_QUEUE, NotificationType } from './notification.constants';
import {
  guideRegisteredTemplate,
  guideVerifiedTemplate,
} from './email/templates/tour-guide-notification.templates';
import {
  genericOtpTemplate,
  verifyEmailOtpTemplate,
} from './email/templates/auth-notification.templates';
import { EnvService } from 'src/env/env.service';
import { MailService } from 'src/mail/mail.service';

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

interface OtpIssuedJobData {
  purpose: string;
  target: string;
  code: string;
  expiresAt: string;
}

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly mailService: MailService,
    private readonly envService: EnvService,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {
    super();
  }

  async process(
    job: Job<
      GuideRegisteredJobData | GuideVerifiedJobData | OtpIssuedJobData | any
    >,
  ) {
    this.logger.log(`Processing job ${job.name} [${job.id}]`);

    switch (job.name) {
      case 'guide-registered':
        await this.handleGuideRegistered(job.data as GuideRegisteredJobData);
        break;
      case 'guide-verified':
        await this.handleGuideVerified(job.data as GuideVerifiedJobData);
        break;
      case 'auth-otp-issued':
        await this.handleOtpIssued(job.data as OtpIssuedJobData);
        break;
      case 'tour-created':
        await this.handleTourCreatedOrUpdated(
          job.data as any,
          NotificationType.TOUR_CREATED,
        );
        break;
      case 'tour-updated':
        await this.handleTourCreatedOrUpdated(
          job.data as any,
          NotificationType.TOUR_UPDATED,
        );
        break;
      case 'tour-deleted':
        await this.handleTourDeleted(job.data as any);
        break;
      case 'tour-inventory-low':
        await this.handleTourInventoryEvent(
          job.data as any,
          NotificationType.TOUR_INVENTORY_LOW,
        );
        break;
      case 'tour-inventory-sold-out':
        await this.handleTourInventoryEvent(
          job.data as any,
          NotificationType.TOUR_INVENTORY_SOLD_OUT,
        );
        break;
      case 'tour-inventory-restocked':
        await this.handleTourInventoryEvent(
          job.data as any,
          NotificationType.TOUR_INVENTORY_RESTOCKED,
        );
        break;
      case 'tour-booking-created':
        await this.handleTourBookingEvent(
          job.data as any,
          NotificationType.TOUR_BOOKING_CREATED,
        );
        break;
      case 'tour-booking-confirmed':
        await this.handleTourBookingEvent(
          job.data as any,
          NotificationType.TOUR_BOOKING_CONFIRMED,
        );
        break;
      case 'tour-booking-cancelled':
        await this.handleTourBookingEvent(
          job.data as any,
          NotificationType.TOUR_BOOKING_CANCELLED,
        );
        break;
      case 'tour-booking-payment-failed':
        await this.handleTourBookingEvent(
          job.data as any,
          NotificationType.TOUR_BOOKING_PAYMENT_FAILED,
        );
        break;
      case 'tour-booking-overbooking':
        await this.handleTourBookingEvent(
          job.data as any,
          NotificationType.TOUR_BOOKING_OVERBOOKING,
        );
        break;
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleGuideRegistered(data: GuideRegisteredJobData) {
    const adminUsers = await this.userModel
      .find({ roles: 'ADMIN', isActive: true })
      .select('_id email fullName')
      .lean();

    // In-app notifications for all admins
    if (adminUsers.length > 0) {
      const notifications = adminUsers.map((admin) => ({
        recipientId: String(admin._id),
        type: NotificationType.GUIDE_REGISTRATION_PENDING,
        title: 'notification.guide_registration_pending.title',
        message: 'notification.guide_registration_pending.message',
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
        await this.mailService.send({
          to: email,
          subject: template.subject,
          html: template.html,
        });
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
      ? 'notification.guide_verified.title'
      : 'notification.guide_rejected.title';

    const message = data.isVerified
      ? 'notification.guide_verified.message'
      : 'notification.guide_rejected.message';

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
        await this.mailService.send({
          to: data.userEmail,
          subject: template.subject,
          html: template.html,
        });
      } catch (error) {
        this.logger.error(`Failed to send email to user: ${error.message}`);
      }
    }
  }

  private async handleOtpIssued(data: OtpIssuedJobData) {
    const feBaseUrl = this.envService.get(
      'FE_BASE_URL',
      'http://localhost:5173',
    );

    let confirmUrl = feBaseUrl;
    if (data.purpose === 'VERIFY_EMAIL') {
      confirmUrl = `${feBaseUrl}/verify-email?target=${encodeURIComponent(data.target)}`;
    }

    const baseTemplateData = {
      code: data.code,
      expiresAt: data.expiresAt,
      confirmUrl,
    };

    const template =
      data.purpose === 'VERIFY_EMAIL'
        ? verifyEmailOtpTemplate({
            ...baseTemplateData,
            purpose: 'VERIFY_EMAIL',
          })
        : genericOtpTemplate({
            ...baseTemplateData,
            purpose: data.purpose,
          });

    try {
      await this.mailService.send({
        to: data.target,
        subject: template.subject,
        html: template.html,
      });
      this.logger.log(
        `OTP email sent to ${data.target} for purpose=${data.purpose}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to send OTP email to ${data.target}: ${error?.message ?? error}`,
      );
    }
  }

  private async handleTourCreatedOrUpdated(
    data: { tourId: string; tourCode?: string; tourName?: string },
    type: NotificationType.TOUR_CREATED | NotificationType.TOUR_UPDATED,
  ) {
    const adminUsers = await this.userModel
      .find({ roles: 'ADMIN', isActive: true })
      .select('_id')
      .lean();

    if (adminUsers.length === 0) return;

    const notifications = adminUsers.map((admin) => ({
      recipientId: String(admin._id),
      type,
      title:
        type === NotificationType.TOUR_CREATED
          ? 'notification.tour_created.title'
          : 'notification.tour_updated.title',
      message:
        type === NotificationType.TOUR_CREATED
          ? 'notification.tour_created.message'
          : 'notification.tour_updated.message',
      metadata: {
        tourId: data.tourId,
        tourCode: data.tourCode,
        tourName: data.tourName,
      },
      link: `/dashboard/tour/${data.tourId}/edit`,
    }));

    await this.notificationService.createMany(notifications);
  }

  private async handleTourDeleted(data: {
    tourId: string;
    tourCode?: string;
    tourName?: string;
  }) {
    const adminUsers = await this.userModel
      .find({ roles: 'ADMIN', isActive: true })
      .select('_id')
      .lean();

    if (adminUsers.length === 0) return;

    const notifications = adminUsers.map((admin) => ({
      recipientId: String(admin._id),
      type: NotificationType.TOUR_DELETED,
      title: 'notification.tour_deleted.title',
      message: 'notification.tour_deleted.message',
      metadata: {
        tourId: data.tourId,
        tourCode: data.tourCode,
        tourName: data.tourName,
      },
      link: `/dashboard/tour`,
    }));

    await this.notificationService.createMany(notifications);
  }

  private async handleTourInventoryEvent(
    data: {
      tourId: string;
      departureDate: string;
      totalSlots: number;
      availableSlots: number;
    },
    type:
      | NotificationType.TOUR_INVENTORY_LOW
      | NotificationType.TOUR_INVENTORY_SOLD_OUT
      | NotificationType.TOUR_INVENTORY_RESTOCKED,
  ) {
    const adminUsers = await this.userModel
      .find({ roles: 'ADMIN', isActive: true })
      .select('_id')
      .lean();

    if (adminUsers.length === 0) return;

    const baseKey =
      type === NotificationType.TOUR_INVENTORY_LOW
        ? 'notification.tour_inventory_low'
        : type === NotificationType.TOUR_INVENTORY_SOLD_OUT
          ? 'notification.tour_inventory_sold_out'
          : 'notification.tour_inventory_restocked';

    const notifications = adminUsers.map((admin) => ({
      recipientId: String(admin._id),
      type,
      title: `${baseKey}.title`,
      message: `${baseKey}.message`,
      metadata: {
        tourId: data.tourId,
        departureDate: data.departureDate,
        totalSlots: data.totalSlots,
        availableSlots: data.availableSlots,
      },
      link: `/dashboard/tour/inventory`,
    }));

    await this.notificationService.createMany(notifications);
  }

  private async handleTourBookingEvent(
    data: {
      bookingId: string;
      bookingCode: string;
      tourId: string;
      tourName?: string;
    },
    type:
      | NotificationType.TOUR_BOOKING_CREATED
      | NotificationType.TOUR_BOOKING_CONFIRMED
      | NotificationType.TOUR_BOOKING_CANCELLED
      | NotificationType.TOUR_BOOKING_PAYMENT_FAILED
      | NotificationType.TOUR_BOOKING_OVERBOOKING,
  ) {
    const adminUsers = await this.userModel
      .find({ roles: 'ADMIN', isActive: true })
      .select('_id')
      .lean();

    if (adminUsers.length === 0) return;

    let baseKey = '';
    switch (type) {
      case NotificationType.TOUR_BOOKING_CREATED:
        baseKey = 'notification.tour_booking_created';
        break;
      case NotificationType.TOUR_BOOKING_CONFIRMED:
        baseKey = 'notification.tour_booking_confirmed';
        break;
      case NotificationType.TOUR_BOOKING_CANCELLED:
        baseKey = 'notification.tour_booking_cancelled';
        break;
      case NotificationType.TOUR_BOOKING_PAYMENT_FAILED:
        baseKey = 'notification.tour_booking_payment_failed';
        break;
      case NotificationType.TOUR_BOOKING_OVERBOOKING:
        baseKey = 'notification.tour_booking_overbooking';
        break;
    }

    const notifications = adminUsers.map((admin) => ({
      recipientId: String(admin._id),
      type,
      title: `${baseKey}.title`,
      message: `${baseKey}.message`,
      metadata: {
        bookingId: data.bookingId,
        bookingCode: data.bookingCode,
        tourId: data.tourId,
        tourName: data.tourName,
      },
      link: `/dashboard/tour-bookings/${data.bookingId}`,
    }));

    await this.notificationService.createMany(notifications);
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
