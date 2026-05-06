/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
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
import { IdempotencyService } from 'src/idempotency/idempotency.service';
import {
  normalizeNotificationJobData,
  NotificationJobEnvelope,
} from './notification.contracts';

interface GuideRegisteredInAppJobData {
  recipientId: string;
  guideId: string;
  userId: string;
  userName?: string;
}

interface GuideRegisteredEmailJobData {
  to: string;
  guideId: string;
  userId: string;
  userName?: string;
}

interface GuideVerifiedInAppJobData {
  recipientId: string;
  guideId: string;
  userName?: string;
  isVerified: boolean;
}

interface GuideVerifiedEmailJobData {
  to: string;
  guideId: string;
  userName?: string;
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
    private readonly idempotencyService: IdempotencyService,
  ) {
    super();
  }

  private normalizeJobData<T>(job: Job<unknown>): NotificationJobEnvelope<T> {
    return normalizeNotificationJobData<T>(job.data, {
      eventName: job.name,
      source: NotificationProcessor.name,
    });
  }

  async process(job: Job<unknown>) {
    const normalized = this.normalizeJobData<unknown>(job);
    this.logger.log({
      requestId: normalized.requestId,
      eventId: normalized.eventId,
      eventName: normalized.eventName,
      jobId: job.id,
      jobName: job.name,
      message: 'Processing notification job',
    });

    const jobId = String(
      job.id ?? `${job.name}:${normalized.eventId}:${normalized.occurredAt}`,
    );
    await this.idempotencyService.executeJobOnce(jobId, job.name, async () => {
      await this.processJob(job);
    });
  }

  private async processJob(job: Job<unknown>): Promise<void> {
    switch (job.name) {
      case 'guide-registered-inapp':
        await this.handleGuideRegisteredInApp(
          this.normalizeJobData<GuideRegisteredInAppJobData>(job).payload,
        );
        break;
      case 'guide-registered-email':
        await this.handleGuideRegisteredEmail(
          this.normalizeJobData<GuideRegisteredEmailJobData>(job).payload,
        );
        break;
      case 'guide-verified-inapp':
        await this.handleGuideVerifiedInApp(
          this.normalizeJobData<GuideVerifiedInAppJobData>(job).payload,
        );
        break;
      case 'guide-verified-email':
        await this.handleGuideVerifiedEmail(
          this.normalizeJobData<GuideVerifiedEmailJobData>(job).payload,
        );
        break;
      case 'auth-otp-issued':
        await this.handleOtpIssued(
          this.normalizeJobData<OtpIssuedJobData>(job).payload,
        );
        break;
      case 'tour-created':
        await this.handleTourCreatedOrUpdated(
          this.normalizeJobData<any>(job).payload,
          NotificationType.TOUR_CREATED,
        );
        break;
      case 'tour-updated':
        await this.handleTourCreatedOrUpdated(
          this.normalizeJobData<any>(job).payload,
          NotificationType.TOUR_UPDATED,
        );
        break;
      case 'tour-deleted':
        await this.handleTourDeleted(this.normalizeJobData<any>(job).payload);
        break;
      case 'tour-inventory-low':
        await this.handleTourInventoryEvent(
          this.normalizeJobData<any>(job).payload,
          NotificationType.TOUR_INVENTORY_LOW,
        );
        break;
      case 'tour-inventory-sold-out':
        await this.handleTourInventoryEvent(
          this.normalizeJobData<any>(job).payload,
          NotificationType.TOUR_INVENTORY_SOLD_OUT,
        );
        break;
      case 'tour-inventory-restocked':
        await this.handleTourInventoryEvent(
          this.normalizeJobData<any>(job).payload,
          NotificationType.TOUR_INVENTORY_RESTOCKED,
        );
        break;
      case 'tour-booking-created':
        await this.handleTourBookingEvent(
          this.normalizeJobData<any>(job).payload,
          NotificationType.TOUR_BOOKING_CREATED,
        );
        break;
      case 'tour-booking-confirmed':
        await this.handleTourBookingEvent(
          this.normalizeJobData<any>(job).payload,
          NotificationType.TOUR_BOOKING_CONFIRMED,
        );
        break;
      case 'tour-booking-cancelled':
        await this.handleTourBookingEvent(
          this.normalizeJobData<any>(job).payload,
          NotificationType.TOUR_BOOKING_CANCELLED,
        );
        break;
      case 'tour-booking-payment-failed':
        await this.handleTourBookingEvent(
          this.normalizeJobData<any>(job).payload,
          NotificationType.TOUR_BOOKING_PAYMENT_FAILED,
        );
        break;
      case 'tour-booking-overbooking':
        await this.handleTourBookingEvent(
          this.normalizeJobData<any>(job).payload,
          NotificationType.TOUR_BOOKING_OVERBOOKING,
        );
        break;
      case 'tour-booking-payment-expired-user':
        await this.handleTourBookingPaymentExpiredUser(
          this.normalizeJobData<any>(job).payload,
        );
        break;
      case 'room-booking-payment-expired-user':
        await this.handleRoomBookingPaymentExpiredUser(
          this.normalizeJobData<any>(job).payload,
        );
        break;
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleGuideRegisteredInApp(data: GuideRegisteredInAppJobData) {
    await this.notificationService.create({
      recipientId: data.recipientId,
      type: NotificationType.GUIDE_REGISTRATION_PENDING,
      title: 'notification.guide_registration_pending.title',
      message: 'notification.guide_registration_pending.message',
      metadata: { guideId: data.guideId, userId: data.userId },
      link: `/admin/tour-guides/${data.guideId}`,
    });
  }

  private async handleGuideRegisteredEmail(data: GuideRegisteredEmailJobData) {
    const template = guideRegisteredTemplate({
      guideName: data.userName || 'Không rõ tên',
      guideId: data.guideId,
    });

    await this.mailService.send({
      to: data.to,
      subject: template.subject,
      html: template.html,
    });
  }

  private async handleGuideVerifiedInApp(data: GuideVerifiedInAppJobData) {
    const type = data.isVerified
      ? NotificationType.GUIDE_VERIFIED
      : NotificationType.GUIDE_REJECTED;

    const title = data.isVerified
      ? 'notification.guide_verified.title'
      : 'notification.guide_rejected.title';

    const message = data.isVerified
      ? 'notification.guide_verified.message'
      : 'notification.guide_rejected.message';

    await this.notificationService.create({
      recipientId: data.recipientId,
      type,
      title,
      message,
      metadata: { guideId: data.guideId },
      link: '/guide/my-profile',
    });
  }

  private async handleGuideVerifiedEmail(data: GuideVerifiedEmailJobData) {
    const template = guideVerifiedTemplate({
      guideName: data.userName || 'Bạn',
      isVerified: data.isVerified,
    });

    await this.mailService.send({
      to: data.to,
      subject: template.subject,
      html: template.html,
    });
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

    await this.mailService.send({
      to: data.target,
      subject: template.subject,
      html: template.html,
    });
  }

  private async handleTourCreatedOrUpdated(
    data: {
      recipientId: string;
      tourId: string;
      tourCode?: string;
      tourName?: string;
    },
    type: NotificationType.TOUR_CREATED | NotificationType.TOUR_UPDATED,
  ) {
    await this.notificationService.create({
      recipientId: data.recipientId,
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
    });
  }

  private async handleTourDeleted(data: {
    recipientId: string;
    tourId: string;
    tourCode?: string;
    tourName?: string;
  }) {
    await this.notificationService.create({
      recipientId: data.recipientId,
      type: NotificationType.TOUR_DELETED,
      title: 'notification.tour_deleted.title',
      message: 'notification.tour_deleted.message',
      metadata: {
        tourId: data.tourId,
        tourCode: data.tourCode,
        tourName: data.tourName,
      },
      link: `/dashboard/tour`,
    });
  }

  private async handleTourInventoryEvent(
    data: {
      recipientId: string;
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
    const baseKey =
      type === NotificationType.TOUR_INVENTORY_LOW
        ? 'notification.tour_inventory_low'
        : type === NotificationType.TOUR_INVENTORY_SOLD_OUT
          ? 'notification.tour_inventory_sold_out'
          : 'notification.tour_inventory_restocked';

    await this.notificationService.create({
      recipientId: data.recipientId,
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
    });
  }

  private async handleTourBookingEvent(
    data: {
      recipientId: string;
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

    await this.notificationService.create({
      recipientId: data.recipientId,
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
    });
  }

  /** FE Client — cron hết hạn thanh toán tour. */
  private async handleTourBookingPaymentExpiredUser(data: {
    recipientId: string;
    bookingId: string;
    bookingCode: string;
    tourId: string;
    tourName?: string;
  }) {
    await this.notificationService.create({
      recipientId: data.recipientId,
      type: NotificationType.TOUR_BOOKING_PAYMENT_EXPIRED,
      title: 'notification.tour_booking_payment_expired.title',
      message: 'notification.tour_booking_payment_expired.message',
      metadata: {
        bookingId: data.bookingId,
        bookingCode: data.bookingCode,
        tourId: data.tourId,
        tourName: data.tourName,
      },
      link: `/bookings/tour/${data.bookingId}`,
    });
  }

  /** FE Client — cron hết hạn thanh toán phòng. */
  private async handleRoomBookingPaymentExpiredUser(data: {
    recipientId: string;
    bookingId: string;
  }) {
    await this.notificationService.create({
      recipientId: data.recipientId,
      type: NotificationType.ROOM_BOOKING_PAYMENT_EXPIRED,
      title: 'notification.room_booking_payment_expired.title',
      message: 'notification.room_booking_payment_expired.message',
      metadata: {
        bookingId: data.bookingId,
      },
      link: `/bookings/room/${data.bookingId}`,
    });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    const normalized = this.normalizeJobData<unknown>(job as Job<unknown>);
    this.logger.error({
      requestId: normalized.requestId,
      eventId: normalized.eventId,
      eventName: normalized.eventName,
      jobId: job.id,
      jobName: job.name,
      attemptsMade: job.attemptsMade,
      attempts: job.opts.attempts,
      error: error.message,
    });
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    const normalized = this.normalizeJobData<unknown>(job as Job<unknown>);
    this.logger.log({
      requestId: normalized.requestId,
      eventId: normalized.eventId,
      eventName: normalized.eventName,
      jobId: job.id,
      jobName: job.name,
      message: 'Notification job completed',
    });
  }
}
