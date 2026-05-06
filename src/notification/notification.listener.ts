import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EnvService } from 'src/env/env.service';
import { normalizeDomainEventEnvelope } from 'src/common/events/domain-event';
import {
  createNotificationJobEnvelope,
  NotificationJobEnvelope,
} from './notification.contracts';
import {
  buildStableJobId,
  DEFAULT_QUEUE_JOB_OPTIONS,
} from 'src/common/queue/queue-policy';
import { User, UserDocument } from 'src/user/schema/user.schema';
import {
  NOTIFICATION_QUEUE,
  NotificationEvent,
} from './notification.constants';
import { TourGuideNotificationEvent } from './events/tour-guide-notification.event';
import { TourNotificationEvent } from './events/tour-notification.event';
import { TourInventoryNotificationEvent } from './events/tour-inventory-notification.event';
import { TourBookingNotificationEvent } from './events/tour-booking-notification.event';
import {
  RoomBookingPaymentExpiredClientEvent,
  TourBookingPaymentExpiredClientEvent,
} from './events/booking-payment-expired-client.event';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    @InjectQueue(NOTIFICATION_QUEUE) private readonly notificationQueue: Queue,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly envService: EnvService,
  ) {}

  private getBullOpts() {
    return { ...DEFAULT_QUEUE_JOB_OPTIONS };
  }

  private normalizeEvent<T>(
    event: unknown,
    expectedEventName: NotificationEvent,
  ) {
    return normalizeDomainEventEnvelope<T>({
      event,
      expectedEventName: String(expectedEventName),
      source: NotificationListener.name,
      legacyPayloadFactory: (legacyEvent) => legacyEvent as T,
    });
  }

  private async enqueueNotificationJob<T>(
    jobName: string,
    data: NotificationJobEnvelope<T>,
    stableIdParts: Array<string | number | undefined>,
  ) {
    return this.notificationQueue.add(jobName, data, {
      ...this.getBullOpts(),
      jobId: buildStableJobId(jobName, ...stableIdParts),
    });
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
  async onGuideRegistered(event: unknown) {
    const normalized = this.normalizeEvent<TourGuideNotificationEvent>(
      event,
      NotificationEvent.GUIDE_REGISTERED,
    );
    const payload = normalized.payload;
    this.logger.log(`Guide registered event: ${payload.guideId}`);

    const adminUsers = await this.userModel
      .find({ roles: 'ADMIN', isActive: true })
      .select('_id email')
      .lean();

    if (adminUsers.length === 0) return;

    // 1) In-app notifications (per recipient)
    await this.addJobsAllSettled(adminUsers, (admin) =>
      this.enqueueNotificationJob(
        'guide-registered-inapp',
        createNotificationJobEnvelope({
          eventName: normalized.eventName,
          eventId: normalized.eventId,
          occurredAt: normalized.occurredAt,
          requestId: normalized.requestId,
          source: normalized.source,
          payload: {
            recipientId: String(admin._id),
            guideId: payload.guideId,
            userId: payload.userId,
            userName: payload.userName,
          },
        }),
        [String(admin._id), payload.guideId, normalized.eventId],
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
      this.enqueueNotificationJob(
        'guide-registered-email',
        createNotificationJobEnvelope({
          eventName: normalized.eventName,
          eventId: normalized.eventId,
          occurredAt: normalized.occurredAt,
          requestId: normalized.requestId,
          source: normalized.source,
          payload: {
            to,
            guideId: payload.guideId,
            userId: payload.userId,
            userName: payload.userName,
          },
        }),
        [to, payload.guideId, normalized.eventId],
      ),
    );
  }

  @OnEvent(NotificationEvent.GUIDE_VERIFIED)
  async onGuideVerified(event: unknown) {
    const normalized = this.normalizeEvent<TourGuideNotificationEvent>(
      event,
      NotificationEvent.GUIDE_VERIFIED,
    );
    const payload = normalized.payload;
    this.logger.log(
      `Guide verified event: ${payload.guideId}, verified=${payload.isVerified}`,
    );

    // In-app notification (single recipient)
    await this.enqueueNotificationJob(
      'guide-verified-inapp',
      createNotificationJobEnvelope({
        eventName: normalized.eventName,
        eventId: normalized.eventId,
        occurredAt: normalized.occurredAt,
        requestId: normalized.requestId,
        source: normalized.source,
        payload: {
          recipientId: payload.userId,
          guideId: payload.guideId,
          userName: payload.userName,
          userEmail: payload.userEmail,
          isVerified: payload.isVerified,
        },
      }),
      [payload.userId, payload.guideId, normalized.eventId],
    );

    // Email (single recipient, only if available)
    if (payload.userEmail) {
      await this.enqueueNotificationJob(
        'guide-verified-email',
        createNotificationJobEnvelope({
          eventName: normalized.eventName,
          eventId: normalized.eventId,
          occurredAt: normalized.occurredAt,
          requestId: normalized.requestId,
          source: normalized.source,
          payload: {
            to: payload.userEmail,
            guideId: payload.guideId,
            userName: payload.userName,
            isVerified: payload.isVerified,
          },
        }),
        [payload.userEmail, payload.guideId, normalized.eventId],
      );
    }
  }

  @OnEvent(NotificationEvent.TOUR_CREATED)
  async onTourCreated(event: unknown) {
    const normalized = this.normalizeEvent<TourNotificationEvent>(
      event,
      NotificationEvent.TOUR_CREATED,
    );
    const payload = normalized.payload;
    this.logger.log(`Tour created event: ${payload.tourId}`);

    const adminUsers = await this.userModel
      .find({ roles: 'ADMIN', isActive: true })
      .select('_id')
      .lean();

    await this.addJobsAllSettled(adminUsers, (admin) =>
      this.enqueueNotificationJob(
        'tour-created',
        createNotificationJobEnvelope({
          eventName: normalized.eventName,
          eventId: normalized.eventId,
          occurredAt: normalized.occurredAt,
          requestId: normalized.requestId,
          source: normalized.source,
          payload: {
            recipientId: String(admin._id),
            tourId: payload.tourId,
            tourCode: payload.tourCode,
            tourName: payload.tourName,
          },
        }),
        [String(admin._id), payload.tourId, normalized.eventId],
      ),
    );
  }

  @OnEvent(NotificationEvent.TOUR_UPDATED)
  async onTourUpdated(event: unknown) {
    const normalized = this.normalizeEvent<TourNotificationEvent>(
      event,
      NotificationEvent.TOUR_UPDATED,
    );
    const payload = normalized.payload;
    this.logger.log(`Tour updated event: ${payload.tourId}`);

    const adminUsers = await this.userModel
      .find({ roles: 'ADMIN', isActive: true })
      .select('_id')
      .lean();

    await this.addJobsAllSettled(adminUsers, (admin) =>
      this.enqueueNotificationJob(
        'tour-updated',
        createNotificationJobEnvelope({
          eventName: normalized.eventName,
          eventId: normalized.eventId,
          occurredAt: normalized.occurredAt,
          requestId: normalized.requestId,
          source: normalized.source,
          payload: {
            recipientId: String(admin._id),
            tourId: payload.tourId,
            tourCode: payload.tourCode,
            tourName: payload.tourName,
          },
        }),
        [String(admin._id), payload.tourId, normalized.eventId],
      ),
    );
  }

  @OnEvent(NotificationEvent.TOUR_DELETED)
  async onTourDeleted(event: unknown) {
    const normalized = this.normalizeEvent<TourNotificationEvent>(
      event,
      NotificationEvent.TOUR_DELETED,
    );
    const payload = normalized.payload;
    this.logger.log(`Tour deleted event: ${payload.tourId}`);

    const adminUsers = await this.userModel
      .find({ roles: 'ADMIN', isActive: true })
      .select('_id')
      .lean();

    await this.addJobsAllSettled(adminUsers, (admin) =>
      this.enqueueNotificationJob(
        'tour-deleted',
        createNotificationJobEnvelope({
          eventName: normalized.eventName,
          eventId: normalized.eventId,
          occurredAt: normalized.occurredAt,
          requestId: normalized.requestId,
          source: normalized.source,
          payload: {
            recipientId: String(admin._id),
            tourId: payload.tourId,
            tourCode: payload.tourCode,
            tourName: payload.tourName,
          },
        }),
        [String(admin._id), payload.tourId, normalized.eventId],
      ),
    );
  }

  @OnEvent(NotificationEvent.TOUR_INVENTORY_LOW)
  async onTourInventoryLow(event: unknown) {
    const normalized = this.normalizeEvent<TourInventoryNotificationEvent>(
      event,
      NotificationEvent.TOUR_INVENTORY_LOW,
    );
    const payload = normalized.payload;
    this.logger.log(
      `Tour inventory LOW: ${payload.tourId} on ${payload.departureDate}`,
    );

    const adminUsers = await this.userModel
      .find({ roles: 'ADMIN', isActive: true })
      .select('_id')
      .lean();

    await this.addJobsAllSettled(adminUsers, (admin) =>
      this.enqueueNotificationJob(
        'tour-inventory-low',
        createNotificationJobEnvelope({
          eventName: normalized.eventName,
          eventId: normalized.eventId,
          occurredAt: normalized.occurredAt,
          requestId: normalized.requestId,
          source: normalized.source,
          payload: {
            recipientId: String(admin._id),
            tourId: payload.tourId,
            departureDate: payload.departureDate,
            totalSlots: payload.totalSlots,
            availableSlots: payload.availableSlots,
          },
        }),
        [
          String(admin._id),
          payload.tourId,
          payload.departureDate,
          normalized.eventId,
        ],
      ),
    );
  }

  @OnEvent(NotificationEvent.TOUR_INVENTORY_SOLD_OUT)
  async onTourInventorySoldOut(event: unknown) {
    const normalized = this.normalizeEvent<TourInventoryNotificationEvent>(
      event,
      NotificationEvent.TOUR_INVENTORY_SOLD_OUT,
    );
    const payload = normalized.payload;
    this.logger.log(
      `Tour inventory SOLD OUT: ${payload.tourId} on ${payload.departureDate}`,
    );

    const adminUsers = await this.userModel
      .find({ roles: 'ADMIN', isActive: true })
      .select('_id')
      .lean();

    await this.addJobsAllSettled(adminUsers, (admin) =>
      this.enqueueNotificationJob(
        'tour-inventory-sold-out',
        createNotificationJobEnvelope({
          eventName: normalized.eventName,
          eventId: normalized.eventId,
          occurredAt: normalized.occurredAt,
          requestId: normalized.requestId,
          source: normalized.source,
          payload: {
            recipientId: String(admin._id),
            tourId: payload.tourId,
            departureDate: payload.departureDate,
            totalSlots: payload.totalSlots,
            availableSlots: payload.availableSlots,
          },
        }),
        [
          String(admin._id),
          payload.tourId,
          payload.departureDate,
          normalized.eventId,
        ],
      ),
    );
  }

  @OnEvent(NotificationEvent.TOUR_INVENTORY_RESTOCKED)
  async onTourInventoryRestocked(event: unknown) {
    const normalized = this.normalizeEvent<TourInventoryNotificationEvent>(
      event,
      NotificationEvent.TOUR_INVENTORY_RESTOCKED,
    );
    const payload = normalized.payload;
    this.logger.log(
      `Tour inventory RESTOCKED: ${payload.tourId} on ${payload.departureDate}`,
    );

    const adminUsers = await this.userModel
      .find({ roles: 'ADMIN', isActive: true })
      .select('_id')
      .lean();

    await this.addJobsAllSettled(adminUsers, (admin) =>
      this.enqueueNotificationJob(
        'tour-inventory-restocked',
        createNotificationJobEnvelope({
          eventName: normalized.eventName,
          eventId: normalized.eventId,
          occurredAt: normalized.occurredAt,
          requestId: normalized.requestId,
          source: normalized.source,
          payload: {
            recipientId: String(admin._id),
            tourId: payload.tourId,
            departureDate: payload.departureDate,
            totalSlots: payload.totalSlots,
            availableSlots: payload.availableSlots,
          },
        }),
        [
          String(admin._id),
          payload.tourId,
          payload.departureDate,
          normalized.eventId,
        ],
      ),
    );
  }

  @OnEvent(NotificationEvent.TOUR_BOOKING_CREATED)
  async onTourBookingCreated(event: unknown) {
    const normalized = this.normalizeEvent<TourBookingNotificationEvent>(
      event,
      NotificationEvent.TOUR_BOOKING_CREATED,
    );
    const payload = normalized.payload;
    this.logger.log(`Tour booking created: ${payload.bookingId}`);

    const adminUsers = await this.userModel
      .find({ roles: 'ADMIN', isActive: true })
      .select('_id')
      .lean();

    await this.addJobsAllSettled(adminUsers, (admin) =>
      this.enqueueNotificationJob(
        'tour-booking-created',
        createNotificationJobEnvelope({
          eventName: normalized.eventName,
          eventId: normalized.eventId,
          occurredAt: normalized.occurredAt,
          requestId: normalized.requestId,
          source: normalized.source,
          payload: {
            recipientId: String(admin._id),
            bookingId: payload.bookingId,
            bookingCode: payload.bookingCode,
            tourId: payload.tourId,
            tourName: payload.tourName,
          },
        }),
        [String(admin._id), payload.bookingId, normalized.eventId],
      ),
    );
  }

  @OnEvent(NotificationEvent.TOUR_BOOKING_CONFIRMED)
  async onTourBookingConfirmed(event: unknown) {
    const normalized = this.normalizeEvent<TourBookingNotificationEvent>(
      event,
      NotificationEvent.TOUR_BOOKING_CONFIRMED,
    );
    const payload = normalized.payload;
    this.logger.log(`Tour booking confirmed: ${payload.bookingId}`);

    const adminUsers = await this.userModel
      .find({ roles: 'ADMIN', isActive: true })
      .select('_id')
      .lean();

    await this.addJobsAllSettled(adminUsers, (admin) =>
      this.enqueueNotificationJob(
        'tour-booking-confirmed',
        createNotificationJobEnvelope({
          eventName: normalized.eventName,
          eventId: normalized.eventId,
          occurredAt: normalized.occurredAt,
          requestId: normalized.requestId,
          source: normalized.source,
          payload: {
            recipientId: String(admin._id),
            bookingId: payload.bookingId,
            bookingCode: payload.bookingCode,
            tourId: payload.tourId,
            tourName: payload.tourName,
          },
        }),
        [String(admin._id), payload.bookingId, normalized.eventId],
      ),
    );
  }

  @OnEvent(NotificationEvent.TOUR_BOOKING_CANCELLED)
  async onTourBookingCancelled(event: unknown) {
    const normalized = this.normalizeEvent<TourBookingNotificationEvent>(
      event,
      NotificationEvent.TOUR_BOOKING_CANCELLED,
    );
    const payload = normalized.payload;
    this.logger.log(`Tour booking cancelled: ${payload.bookingId}`);

    const adminUsers = await this.userModel
      .find({ roles: 'ADMIN', isActive: true })
      .select('_id')
      .lean();

    await this.addJobsAllSettled(adminUsers, (admin) =>
      this.enqueueNotificationJob(
        'tour-booking-cancelled',
        createNotificationJobEnvelope({
          eventName: normalized.eventName,
          eventId: normalized.eventId,
          occurredAt: normalized.occurredAt,
          requestId: normalized.requestId,
          source: normalized.source,
          payload: {
            recipientId: String(admin._id),
            bookingId: payload.bookingId,
            bookingCode: payload.bookingCode,
            tourId: payload.tourId,
            tourName: payload.tourName,
          },
        }),
        [String(admin._id), payload.bookingId, normalized.eventId],
      ),
    );
  }

  @OnEvent(NotificationEvent.TOUR_BOOKING_PAYMENT_FAILED)
  async onTourBookingPaymentFailed(event: unknown) {
    const normalized = this.normalizeEvent<TourBookingNotificationEvent>(
      event,
      NotificationEvent.TOUR_BOOKING_PAYMENT_FAILED,
    );
    const payload = normalized.payload;
    this.logger.log(`Tour booking payment failed: ${payload.bookingId}`);

    const adminUsers = await this.userModel
      .find({ roles: 'ADMIN', isActive: true })
      .select('_id')
      .lean();

    await this.addJobsAllSettled(adminUsers, (admin) =>
      this.enqueueNotificationJob(
        'tour-booking-payment-failed',
        createNotificationJobEnvelope({
          eventName: normalized.eventName,
          eventId: normalized.eventId,
          occurredAt: normalized.occurredAt,
          requestId: normalized.requestId,
          source: normalized.source,
          payload: {
            recipientId: String(admin._id),
            bookingId: payload.bookingId,
            bookingCode: payload.bookingCode,
            tourId: payload.tourId,
            tourName: payload.tourName,
          },
        }),
        [String(admin._id), payload.bookingId, normalized.eventId],
      ),
    );
  }

  @OnEvent(NotificationEvent.TOUR_BOOKING_OVERBOOKING)
  async onTourBookingOverbooking(event: unknown) {
    const normalized = this.normalizeEvent<TourBookingNotificationEvent>(
      event,
      NotificationEvent.TOUR_BOOKING_OVERBOOKING,
    );
    const payload = normalized.payload;
    this.logger.log(`Tour booking overbooking: ${payload.bookingId}`);

    const adminUsers = await this.userModel
      .find({ roles: 'ADMIN', isActive: true })
      .select('_id')
      .lean();

    await this.addJobsAllSettled(adminUsers, (admin) =>
      this.enqueueNotificationJob(
        'tour-booking-overbooking',
        createNotificationJobEnvelope({
          eventName: normalized.eventName,
          eventId: normalized.eventId,
          occurredAt: normalized.occurredAt,
          requestId: normalized.requestId,
          source: normalized.source,
          payload: {
            recipientId: String(admin._id),
            bookingId: payload.bookingId,
            bookingCode: payload.bookingCode,
            tourId: payload.tourId,
            tourName: payload.tourName,
          },
        }),
        [String(admin._id), payload.bookingId, normalized.eventId],
      ),
    );
  }

  /** User client — đơn tour hết hạn thanh toán (cron). */
  @OnEvent(NotificationEvent.TOUR_BOOKING_PAYMENT_EXPIRED)
  async onTourBookingPaymentExpiredClient(event: unknown) {
    const normalized =
      this.normalizeEvent<TourBookingPaymentExpiredClientEvent>(
        event,
        NotificationEvent.TOUR_BOOKING_PAYMENT_EXPIRED,
      );
    const payload = normalized.payload;
    this.logger.log(
      `Tour booking payment expired (user notify): ${payload.bookingId}`,
    );

    await this.enqueueNotificationJob(
      'tour-booking-payment-expired-user',
      createNotificationJobEnvelope({
        eventName: normalized.eventName,
        eventId: normalized.eventId,
        occurredAt: normalized.occurredAt,
        requestId: normalized.requestId,
        source: normalized.source,
        payload: {
          recipientId: payload.userId,
          bookingId: payload.bookingId,
          bookingCode: payload.bookingCode,
          tourId: payload.tourId,
          tourName: payload.tourName,
        },
      }),
      [payload.userId, payload.bookingId, normalized.eventId],
    );
  }

  /** User client — đặt phòng hết hạn thanh toán (cron). */
  @OnEvent(NotificationEvent.ROOM_BOOKING_PAYMENT_EXPIRED)
  async onRoomBookingPaymentExpiredClient(event: unknown) {
    const normalized =
      this.normalizeEvent<RoomBookingPaymentExpiredClientEvent>(
        event,
        NotificationEvent.ROOM_BOOKING_PAYMENT_EXPIRED,
      );
    const payload = normalized.payload;
    this.logger.log(
      `Room booking payment expired (user notify): ${payload.bookingId}`,
    );

    await this.enqueueNotificationJob(
      'room-booking-payment-expired-user',
      createNotificationJobEnvelope({
        eventName: normalized.eventName,
        eventId: normalized.eventId,
        occurredAt: normalized.occurredAt,
        requestId: normalized.requestId,
        source: normalized.source,
        payload: {
          recipientId: payload.userId,
          bookingId: payload.bookingId,
        },
      }),
      [payload.userId, payload.bookingId, normalized.eventId],
    );
  }

  @OnEvent(NotificationEvent.OTP_ISSUED)
  async onOtpIssued(event: unknown) {
    const normalized = this.normalizeEvent<{
      purpose: string;
      target: string;
      code: string;
      meta?: Record<string, unknown>;
      expiresAt: string;
    }>(event, NotificationEvent.OTP_ISSUED);
    const payload = normalized.payload;
    this.logger.log(
      `OTP issued for purpose=${payload.purpose} target=${payload.target}`,
    );

    await this.enqueueNotificationJob(
      'auth-otp-issued',
      createNotificationJobEnvelope({
        eventName: normalized.eventName,
        eventId: normalized.eventId,
        occurredAt: normalized.occurredAt,
        requestId: normalized.requestId,
        source: normalized.source,
        payload: {
          purpose: payload.purpose,
          target: payload.target,
          code: payload.code,
          expiresAt: payload.expiresAt,
        },
      }),
      [payload.target, payload.purpose, normalized.eventId],
    );
  }
}
