import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EnvService } from 'src/env/env.service';
import { User, UserDocument } from 'src/user/schema/user.schema';
import {
  NOTIFICATION_QUEUE,
  NotificationEvent,
} from './notification.constants';
import { TourGuideNotificationEvent } from './events/tour-guide-notification.event';
import { TourNotificationEvent } from './events/tour-notification.event';
import { TourInventoryNotificationEvent } from './events/tour-inventory-notification.event';
import { TourBookingNotificationEvent } from './events/tour-booking-notification.event';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    @InjectQueue(NOTIFICATION_QUEUE) private readonly notificationQueue: Queue,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly envService: EnvService,
  ) {}

  private getBullOpts() {
    return {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    };
  }

  /** Run queue adds in parallel; log rejections but do not fail the whole batch. */
  private async addJobsAllSettled<T>(
    items: T[],
    addOne: (item: T) => Promise<unknown>,
  ): Promise<void> {
    const results = await Promise.allSettled(items.map((item) => addOne(item)));
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        this.logger.warn(
          `Notification queue add failed [${i}]: ${result.reason?.message ?? result.reason}`,
        );
      }
    });
  }

  @OnEvent(NotificationEvent.GUIDE_REGISTERED)
  async onGuideRegistered(event: TourGuideNotificationEvent) {
    this.logger.log(`Guide registered event: ${event.guideId}`);

    const adminUsers = await this.userModel
      .find({ roles: 'ADMIN', isActive: true })
      .select('_id email')
      .lean();

    if (adminUsers.length === 0) return;

    // 1) In-app notifications (per recipient)
    await this.addJobsAllSettled(adminUsers, (admin) =>
      this.notificationQueue.add(
        'guide-registered-inapp',
        {
          recipientId: String(admin._id),
          guideId: event.guideId,
          userId: event.userId,
          userName: event.userName,
        },
        this.getBullOpts(),
      ),
    );

    // 2) Emails (per email recipient)
    const emailRecipients = new Set<string>();
    const adminEmail = this.envService.get('ADMIN_EMAIL');
    if (adminEmail) emailRecipients.add(adminEmail);

    for (const admin of adminUsers) {
      if (admin.email) emailRecipients.add(admin.email);
    }

    await this.addJobsAllSettled([...emailRecipients], (to) =>
      this.notificationQueue.add(
        'guide-registered-email',
        {
          to,
          guideId: event.guideId,
          userId: event.userId,
          userName: event.userName,
        },
        this.getBullOpts(),
      ),
    );
  }

  @OnEvent(NotificationEvent.GUIDE_VERIFIED)
  async onGuideVerified(event: TourGuideNotificationEvent) {
    this.logger.log(
      `Guide verified event: ${event.guideId}, verified=${event.isVerified}`,
    );

    // In-app notification (single recipient)
    await this.notificationQueue.add(
      'guide-verified-inapp',
      {
        recipientId: event.userId,
        guideId: event.guideId,
        userName: event.userName,
        userEmail: event.userEmail,
        isVerified: event.isVerified,
      },
      this.getBullOpts(),
    );

    // Email (single recipient, only if available)
    if (event.userEmail) {
      await this.notificationQueue.add(
        'guide-verified-email',
        {
          to: event.userEmail,
          guideId: event.guideId,
          userName: event.userName,
          isVerified: event.isVerified,
        },
        this.getBullOpts(),
      );
    }
  }

  @OnEvent(NotificationEvent.TOUR_CREATED)
  async onTourCreated(event: TourNotificationEvent) {
    this.logger.log(`Tour created event: ${event.tourId}`);

    const adminUsers = await this.userModel
      .find({ roles: 'ADMIN', isActive: true })
      .select('_id')
      .lean();

    await this.addJobsAllSettled(adminUsers, (admin) =>
      this.notificationQueue.add(
        'tour-created',
        {
          recipientId: String(admin._id),
          tourId: event.tourId,
          tourCode: event.tourCode,
          tourName: event.tourName,
        },
        this.getBullOpts(),
      ),
    );
  }

  @OnEvent(NotificationEvent.TOUR_UPDATED)
  async onTourUpdated(event: TourNotificationEvent) {
    this.logger.log(`Tour updated event: ${event.tourId}`);

    const adminUsers = await this.userModel
      .find({ roles: 'ADMIN', isActive: true })
      .select('_id')
      .lean();

    await this.addJobsAllSettled(adminUsers, (admin) =>
      this.notificationQueue.add(
        'tour-updated',
        {
          recipientId: String(admin._id),
          tourId: event.tourId,
          tourCode: event.tourCode,
          tourName: event.tourName,
        },
        this.getBullOpts(),
      ),
    );
  }

  @OnEvent(NotificationEvent.TOUR_DELETED)
  async onTourDeleted(event: TourNotificationEvent) {
    this.logger.log(`Tour deleted event: ${event.tourId}`);

    const adminUsers = await this.userModel
      .find({ roles: 'ADMIN', isActive: true })
      .select('_id')
      .lean();

    await this.addJobsAllSettled(adminUsers, (admin) =>
      this.notificationQueue.add(
        'tour-deleted',
        {
          recipientId: String(admin._id),
          tourId: event.tourId,
          tourCode: event.tourCode,
          tourName: event.tourName,
        },
        this.getBullOpts(),
      ),
    );
  }

  @OnEvent(NotificationEvent.TOUR_INVENTORY_LOW)
  async onTourInventoryLow(event: TourInventoryNotificationEvent) {
    this.logger.log(
      `Tour inventory LOW: ${event.tourId} on ${event.departureDate}`,
    );

    const adminUsers = await this.userModel
      .find({ roles: 'ADMIN', isActive: true })
      .select('_id')
      .lean();

    await this.addJobsAllSettled(adminUsers, (admin) =>
      this.notificationQueue.add(
        'tour-inventory-low',
        {
          recipientId: String(admin._id),
          tourId: event.tourId,
          departureDate: event.departureDate,
          totalSlots: event.totalSlots,
          availableSlots: event.availableSlots,
        },
        this.getBullOpts(),
      ),
    );
  }

  @OnEvent(NotificationEvent.TOUR_INVENTORY_SOLD_OUT)
  async onTourInventorySoldOut(event: TourInventoryNotificationEvent) {
    this.logger.log(
      `Tour inventory SOLD OUT: ${event.tourId} on ${event.departureDate}`,
    );

    const adminUsers = await this.userModel
      .find({ roles: 'ADMIN', isActive: true })
      .select('_id')
      .lean();

    await this.addJobsAllSettled(adminUsers, (admin) =>
      this.notificationQueue.add(
        'tour-inventory-sold-out',
        {
          recipientId: String(admin._id),
          tourId: event.tourId,
          departureDate: event.departureDate,
          totalSlots: event.totalSlots,
          availableSlots: event.availableSlots,
        },
        this.getBullOpts(),
      ),
    );
  }

  @OnEvent(NotificationEvent.TOUR_INVENTORY_RESTOCKED)
  async onTourInventoryRestocked(event: TourInventoryNotificationEvent) {
    this.logger.log(
      `Tour inventory RESTOCKED: ${event.tourId} on ${event.departureDate}`,
    );

    const adminUsers = await this.userModel
      .find({ roles: 'ADMIN', isActive: true })
      .select('_id')
      .lean();

    await this.addJobsAllSettled(adminUsers, (admin) =>
      this.notificationQueue.add(
        'tour-inventory-restocked',
        {
          recipientId: String(admin._id),
          tourId: event.tourId,
          departureDate: event.departureDate,
          totalSlots: event.totalSlots,
          availableSlots: event.availableSlots,
        },
        this.getBullOpts(),
      ),
    );
  }

  @OnEvent(NotificationEvent.TOUR_BOOKING_CREATED)
  async onTourBookingCreated(event: TourBookingNotificationEvent) {
    this.logger.log(`Tour booking created: ${event.bookingId}`);

    const adminUsers = await this.userModel
      .find({ roles: 'ADMIN', isActive: true })
      .select('_id')
      .lean();

    await this.addJobsAllSettled(adminUsers, (admin) =>
      this.notificationQueue.add(
        'tour-booking-created',
        {
          recipientId: String(admin._id),
          bookingId: event.bookingId,
          bookingCode: event.bookingCode,
          tourId: event.tourId,
          tourName: event.tourName,
        },
        this.getBullOpts(),
      ),
    );
  }

  @OnEvent(NotificationEvent.TOUR_BOOKING_CONFIRMED)
  async onTourBookingConfirmed(event: TourBookingNotificationEvent) {
    this.logger.log(`Tour booking confirmed: ${event.bookingId}`);

    const adminUsers = await this.userModel
      .find({ roles: 'ADMIN', isActive: true })
      .select('_id')
      .lean();

    await this.addJobsAllSettled(adminUsers, (admin) =>
      this.notificationQueue.add(
        'tour-booking-confirmed',
        {
          recipientId: String(admin._id),
          bookingId: event.bookingId,
          bookingCode: event.bookingCode,
          tourId: event.tourId,
          tourName: event.tourName,
        },
        this.getBullOpts(),
      ),
    );
  }

  @OnEvent(NotificationEvent.TOUR_BOOKING_CANCELLED)
  async onTourBookingCancelled(event: TourBookingNotificationEvent) {
    this.logger.log(`Tour booking cancelled: ${event.bookingId}`);

    const adminUsers = await this.userModel
      .find({ roles: 'ADMIN', isActive: true })
      .select('_id')
      .lean();

    await this.addJobsAllSettled(adminUsers, (admin) =>
      this.notificationQueue.add(
        'tour-booking-cancelled',
        {
          recipientId: String(admin._id),
          bookingId: event.bookingId,
          bookingCode: event.bookingCode,
          tourId: event.tourId,
          tourName: event.tourName,
        },
        this.getBullOpts(),
      ),
    );
  }

  @OnEvent(NotificationEvent.TOUR_BOOKING_PAYMENT_FAILED)
  async onTourBookingPaymentFailed(event: TourBookingNotificationEvent) {
    this.logger.log(`Tour booking payment failed: ${event.bookingId}`);

    const adminUsers = await this.userModel
      .find({ roles: 'ADMIN', isActive: true })
      .select('_id')
      .lean();

    await this.addJobsAllSettled(adminUsers, (admin) =>
      this.notificationQueue.add(
        'tour-booking-payment-failed',
        {
          recipientId: String(admin._id),
          bookingId: event.bookingId,
          bookingCode: event.bookingCode,
          tourId: event.tourId,
          tourName: event.tourName,
        },
        this.getBullOpts(),
      ),
    );
  }

  @OnEvent(NotificationEvent.TOUR_BOOKING_OVERBOOKING)
  async onTourBookingOverbooking(event: TourBookingNotificationEvent) {
    this.logger.log(`Tour booking overbooking: ${event.bookingId}`);

    const adminUsers = await this.userModel
      .find({ roles: 'ADMIN', isActive: true })
      .select('_id')
      .lean();

    await this.addJobsAllSettled(adminUsers, (admin) =>
      this.notificationQueue.add(
        'tour-booking-overbooking',
        {
          recipientId: String(admin._id),
          bookingId: event.bookingId,
          bookingCode: event.bookingCode,
          tourId: event.tourId,
          tourName: event.tourName,
        },
        this.getBullOpts(),
      ),
    );
  }

  @OnEvent(NotificationEvent.OTP_ISSUED)
  async onOtpIssued(event: {
    purpose: string;
    target: string;
    code: string;
    meta?: Record<string, unknown>;
    expiresAt: string;
  }) {
    this.logger.log(
      `OTP issued for purpose=${event.purpose} target=${event.target}`,
    );

    await this.notificationQueue.add(
      'auth-otp-issued',
      {
        purpose: event.purpose,
        target: event.target,
        code: event.code,
        expiresAt: event.expiresAt,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
  }
}
