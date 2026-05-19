import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Payment,
  PaymentDocument,
  PaymentStatus,
} from 'src/payment/schema/payment.schema';
import {
  TourBooking,
  TourBookingDocument,
  TourPaymentStatus,
} from './schema/tour-booking.schema';
import { TourBookingService } from './tour-booking.service';

const SAFE_BEFORE_MS = 2 * 60 * 1000;

@Injectable()
export class TourBookingReconcileService {
  private readonly logger = new Logger(TourBookingReconcileService.name);

  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(TourBooking.name)
    private readonly tourBookingModel: Model<TourBookingDocument>,
    private readonly tourBookingService: TourBookingService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async reconcilePaidTourBookings() {
    const safeBefore = new Date(Date.now() - SAFE_BEFORE_MS);

    const payments = await this.paymentModel.find({
      status: PaymentStatus.SUCCEEDED,
      tourBookingId: { $exists: true, $ne: null },
      createdAt: { $lt: safeBefore },
    });

    for (const payment of payments) {
      const tourBookingId = payment.tourBookingId;
      if (!tourBookingId) continue;

      const booking = await this.tourBookingModel.findById(tourBookingId);
      if (!booking) continue;
      if (booking.paymentStatus === TourPaymentStatus.PAID) continue;

      try {
        await this.tourBookingService.markAsPaid(
          String(tourBookingId),
          payment.amount,
          payment.chargeId ?? payment.intentId,
        );
        this.logger.warn(
          `Reconciled tour booking ${String(tourBookingId)} from payment ${String(payment._id)}`,
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Reconcile failed tour ${String(tourBookingId)} payment ${String(payment._id)}: ${msg}`,
        );
      }
    }
  }
}
