import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createDomainEventEnvelope } from 'src/common/events/domain-event';
import {
  TourBooking,
  TourBookingDocument,
  TourBookingStatus,
  TourPaymentStatus,
} from './schema/tour-booking.schema';
import {
  TourInventory,
  TourInventoryDocument,
} from 'src/tour-inventory/schema/tour-inventory.schema';
import { TourInventoryService } from 'src/tour-inventory/tour-inventory.service';
import { Tour, TourDocument } from 'src/tour/schema/tour.schema';
import { NotificationEvent } from 'src/notification/notification.constants';
import { TourBookingPaymentExpiredClientEvent } from 'src/notification/events/booking-payment-expired-client.event';

const EXPIRE_AFTER_MINUTES = 60;

@Injectable()
export class TourBookingExpireService {
  private readonly logger = new Logger(TourBookingExpireService.name);

  constructor(
    @InjectModel(TourBooking.name)
    private readonly tourBookingModel: Model<TourBookingDocument>,
    @InjectModel(TourInventory.name)
    private readonly inventoryModel: Model<TourInventoryDocument>,
    @InjectModel(Tour.name)
    private readonly tourModel: Model<TourDocument>,
    private readonly tourInventoryService: TourInventoryService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async expirePendingTourBookings() {
    const expiredAt = new Date(Date.now() - EXPIRE_AFTER_MINUTES * 60 * 1000);

    const bookings = await this.tourBookingModel.find({
      status: TourBookingStatus.PENDING,
      paymentStatus: TourPaymentStatus.UNPAID,
      createdAt: { $lt: expiredAt },
    });

    for (const booking of bookings) {
      if (booking.status !== TourBookingStatus.PENDING) continue;
      if (booking.paymentStatus !== TourPaymentStatus.UNPAID) continue;

      const totalGuests =
        booking.adults + (booking.children ?? 0) + (booking.infants ?? 0);
      const inv = await this.inventoryModel.findById(booking.tourInventoryId);
      if (inv) {
        await this.tourInventoryService.releaseSlots({
          tourId: String(booking.tourId),
          departureDate: inv.departureDate.toISOString().slice(0, 10),
          slots: totalGuests,
        });
      }

      booking.status = TourBookingStatus.CANCELLED;
      booking.paymentStatus = TourPaymentStatus.EXPIRED;
      booking.cancelledAt = new Date();
      booking.cancelReason = 'Expired - no payment within 1 hour';
      await booking.save();

      this.logger.log(
        `Expired tour booking ${String(booking._id)} (${String(booking.bookingCode ?? '')})`,
      );

      if (booking.userId) {
        const tour = await this.tourModel.findById(booking.tourId).lean();
        const tr = tour?.translations as
          | Record<string, { name?: string }>
          | undefined;
        const tourName = tr?.vi?.name ?? tr?.en?.name ?? undefined;
        this.eventEmitter.emit(
          NotificationEvent.TOUR_BOOKING_PAYMENT_EXPIRED,
          createDomainEventEnvelope({
            eventName: String(NotificationEvent.TOUR_BOOKING_PAYMENT_EXPIRED),
            source: TourBookingExpireService.name,
            payload: new TourBookingPaymentExpiredClientEvent(
              String(booking.userId),
              String(booking._id),
              booking.bookingCode,
              String(booking.tourId),
              tourName,
            ),
          }),
        );
      }
    }
  }
}
