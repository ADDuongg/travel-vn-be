import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
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
  ) {}

  @OnEvent(NotificationEvent.GUIDE_REGISTERED)
  async onGuideRegistered(event: TourGuideNotificationEvent) {
    this.logger.log(`Guide registered event: ${event.guideId}`);
    await this.notificationQueue.add(
      'guide-registered',
      {
        guideId: event.guideId,
        userId: event.userId,
        userName: event.userName,
        userEmail: event.userEmail,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
  }

  @OnEvent(NotificationEvent.GUIDE_VERIFIED)
  async onGuideVerified(event: TourGuideNotificationEvent) {
    this.logger.log(
      `Guide verified event: ${event.guideId}, verified=${event.isVerified}`,
    );
    await this.notificationQueue.add(
      'guide-verified',
      {
        guideId: event.guideId,
        userId: event.userId,
        userName: event.userName,
        userEmail: event.userEmail,
        isVerified: event.isVerified,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
  }

  @OnEvent(NotificationEvent.TOUR_CREATED)
  async onTourCreated(event: TourNotificationEvent) {
    this.logger.log(`Tour created event: ${event.tourId}`);
    await this.notificationQueue.add(
      'tour-created',
      {
        tourId: event.tourId,
        tourCode: event.tourCode,
        tourName: event.tourName,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
  }

  @OnEvent(NotificationEvent.TOUR_UPDATED)
  async onTourUpdated(event: TourNotificationEvent) {
    this.logger.log(`Tour updated event: ${event.tourId}`);
    await this.notificationQueue.add(
      'tour-updated',
      {
        tourId: event.tourId,
        tourCode: event.tourCode,
        tourName: event.tourName,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
  }

  @OnEvent(NotificationEvent.TOUR_DELETED)
  async onTourDeleted(event: TourNotificationEvent) {
    this.logger.log(`Tour deleted event: ${event.tourId}`);
    await this.notificationQueue.add(
      'tour-deleted',
      {
        tourId: event.tourId,
        tourCode: event.tourCode,
        tourName: event.tourName,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
  }

  @OnEvent(NotificationEvent.TOUR_INVENTORY_LOW)
  async onTourInventoryLow(event: TourInventoryNotificationEvent) {
    this.logger.log(
      `Tour inventory LOW: ${event.tourId} on ${event.departureDate}`,
    );
    await this.notificationQueue.add(
      'tour-inventory-low',
      {
        tourId: event.tourId,
        departureDate: event.departureDate,
        totalSlots: event.totalSlots,
        availableSlots: event.availableSlots,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
  }

  @OnEvent(NotificationEvent.TOUR_INVENTORY_SOLD_OUT)
  async onTourInventorySoldOut(event: TourInventoryNotificationEvent) {
    this.logger.log(
      `Tour inventory SOLD OUT: ${event.tourId} on ${event.departureDate}`,
    );
    await this.notificationQueue.add(
      'tour-inventory-sold-out',
      {
        tourId: event.tourId,
        departureDate: event.departureDate,
        totalSlots: event.totalSlots,
        availableSlots: event.availableSlots,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
  }

  @OnEvent(NotificationEvent.TOUR_INVENTORY_RESTOCKED)
  async onTourInventoryRestocked(event: TourInventoryNotificationEvent) {
    this.logger.log(
      `Tour inventory RESTOCKED: ${event.tourId} on ${event.departureDate}`,
    );
    await this.notificationQueue.add(
      'tour-inventory-restocked',
      {
        tourId: event.tourId,
        departureDate: event.departureDate,
        totalSlots: event.totalSlots,
        availableSlots: event.availableSlots,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
  }

  @OnEvent(NotificationEvent.TOUR_BOOKING_CREATED)
  async onTourBookingCreated(event: TourBookingNotificationEvent) {
    this.logger.log(`Tour booking created: ${event.bookingId}`);
    await this.notificationQueue.add(
      'tour-booking-created',
      {
        bookingId: event.bookingId,
        bookingCode: event.bookingCode,
        tourId: event.tourId,
        tourName: event.tourName,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
  }

  @OnEvent(NotificationEvent.TOUR_BOOKING_CONFIRMED)
  async onTourBookingConfirmed(event: TourBookingNotificationEvent) {
    this.logger.log(`Tour booking confirmed: ${event.bookingId}`);
    await this.notificationQueue.add(
      'tour-booking-confirmed',
      {
        bookingId: event.bookingId,
        bookingCode: event.bookingCode,
        tourId: event.tourId,
        tourName: event.tourName,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
  }

  @OnEvent(NotificationEvent.TOUR_BOOKING_CANCELLED)
  async onTourBookingCancelled(event: TourBookingNotificationEvent) {
    this.logger.log(`Tour booking cancelled: ${event.bookingId}`);
    await this.notificationQueue.add(
      'tour-booking-cancelled',
      {
        bookingId: event.bookingId,
        bookingCode: event.bookingCode,
        tourId: event.tourId,
        tourName: event.tourName,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
  }

  @OnEvent(NotificationEvent.TOUR_BOOKING_PAYMENT_FAILED)
  async onTourBookingPaymentFailed(event: TourBookingNotificationEvent) {
    this.logger.log(`Tour booking payment failed: ${event.bookingId}`);
    await this.notificationQueue.add(
      'tour-booking-payment-failed',
      {
        bookingId: event.bookingId,
        bookingCode: event.bookingCode,
        tourId: event.tourId,
        tourName: event.tourName,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
  }

  @OnEvent(NotificationEvent.TOUR_BOOKING_OVERBOOKING)
  async onTourBookingOverbooking(event: TourBookingNotificationEvent) {
    this.logger.log(`Tour booking overbooking: ${event.bookingId}`);
    await this.notificationQueue.add(
      'tour-booking-overbooking',
      {
        bookingId: event.bookingId,
        bookingCode: event.bookingCode,
        tourId: event.tourId,
        tourName: event.tourName,
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
