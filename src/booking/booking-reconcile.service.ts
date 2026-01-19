import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Booking,
  BookingDocument,
  BookingStatus,
  BookingPaymentStatus,
} from './schema/booking.schema';
import {
  Payment,
  PaymentDocument,
  PaymentStatus,
} from '../payment/schema/payment.schema';

@Injectable()
export class BookingReconcileService {
  private readonly logger = new Logger(BookingReconcileService.name);

  constructor(
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<BookingDocument>,

    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
  ) {}

  /*
    Reconcile payment success nhưng booking chưa confirm
   */
  @Cron('*/10 * * * *')
  async reconcilePaidBookings() {
    const safeBefore = new Date(Date.now() - 2 * 60 * 1000);

    const payments = await this.paymentModel.find({
      status: PaymentStatus.SUCCEEDED,
      createdAt: { $lt: safeBefore },
    });

    if (!payments.length) return;

    for (const payment of payments) {
      const bookingId = payment.bookingId as Types.ObjectId;

      const booking = await this.bookingModel.findById(bookingId);
      if (!booking) continue;

      if (booking.status !== BookingStatus.PENDING) continue;
      if (booking.paymentStatus === BookingPaymentStatus.PAID) continue;

      booking.status = BookingStatus.CONFIRMED;
      booking.paymentStatus = BookingPaymentStatus.PAID;

      await booking.save();

      this.logger.warn(
        `🛠 Reconciled booking ${booking.id} from payment ${payment.id}`,
      );
    }
  }
}
