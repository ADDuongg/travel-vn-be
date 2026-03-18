import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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

const EXPIRE_AFTER_MINUTES = 60;

@Injectable()
export class TourBookingExpireService {
  private readonly logger = new Logger(TourBookingExpireService.name);

  constructor(
    @InjectModel(TourBooking.name)
    private readonly tourBookingModel: Model<TourBookingDocument>,
    @InjectModel(TourInventory.name)
    private readonly inventoryModel: Model<TourInventoryDocument>,
    private readonly tourInventoryService: TourInventoryService,
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
        `Expired tour booking ${booking._id} (${booking.bookingCode})`,
      );
    }
  }
}
