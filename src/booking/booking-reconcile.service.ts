import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Types } from 'mongoose';

import { BookingStatus, BookingPaymentStatus } from './schema/booking.schema';
import { BookingRepository } from './booking.repository';
import { PaymentRepository } from 'src/payment/payment.repository';

@Injectable()
export class BookingReconcileService {
  private readonly logger = new Logger(BookingReconcileService.name);

  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly paymentRepository: PaymentRepository,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async reconcilePaidBookings() {
    const safeBefore = new Date(Date.now() - 2 * 60 * 1000);

    const payments =
      await this.paymentRepository.findSucceededBefore(safeBefore);

    if (!payments.length) return;

    for (const payment of payments) {
      const bookingId = payment.bookingId;
      if (!bookingId) continue;

      const booking = await this.bookingRepository.findById(
        bookingId.toString(),
      );
      if (!booking) continue;

      if (booking.status !== BookingStatus.PENDING) continue;
      if (booking.paymentStatus === BookingPaymentStatus.PAID) continue;

      booking.status = BookingStatus.CONFIRMED;
      booking.paymentStatus = BookingPaymentStatus.PAID;

      await this.bookingRepository.save(booking);

      this.logger.warn(
        `🛠 Reconciled booking ${booking.id} from payment ${payment.id}`,
      );
    }
  }
}
