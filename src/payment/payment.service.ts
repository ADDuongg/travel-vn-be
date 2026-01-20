import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BookingService } from '../booking/booking.service';
import { stripe } from '../stripe.service';
import {
  Payment,
  PaymentDocument,
  PaymentStatus,
} from './schema/payment.schema';
import { BookingPaymentStatus } from 'src/booking/schema/booking.schema';

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    private readonly bookingService: BookingService,
  ) {}

  async createPaymentIntent(bookingId: string) {
    if (!Types.ObjectId.isValid(bookingId)) {
      throw new BadRequestException('Invalid bookingId');
    }

    const booking = await this.bookingService.findOne(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.paymentStatus !== BookingPaymentStatus.UNPAID) {
      throw new BadRequestException('Booking already paid');
    }

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(booking.amount),
      currency: booking.currency.toLowerCase(),
      metadata: {
        /* mongo có type safe dùng id cũng được */
        bookingId: booking.id,
      },
    });

    const payment = new this.paymentModel({
      bookingId: booking._id,
      provider: 'STRIPE',
      intentId: intent.id,
      amount: booking.amount,
      currency: booking.currency,
      status: PaymentStatus.PENDING,
    });

    await payment.save();

    return {
      clientSecret: intent.client_secret,
      paymentId: payment._id,
    };
  }

  /* ================= STRIPE WEBHOOK ================= */

  async handleStripeWebhook(signature: string, payload: Buffer) {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
    console.log('event.type', event.type);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object;
        const payment = await this.paymentModel.findOne({
          intentId: intent.id,
        });
        if (!payment) return;

        payment.status = PaymentStatus.SUCCEEDED;
        await payment.save();
        /* console.log('before booking update');
        throw new Error('CRASH HERE'); */

        await this.bookingService.markAsPaid(payment.bookingId.toString());
        break;
      }

      case 'payment_intent.payment_failed': {
        console.log('failed');

        const intent = event.data.object;
        const payment = await this.paymentModel.findOne({
          intentId: intent.id,
        });
        if (!payment) return;

        payment.status = PaymentStatus.FAILED;
        await payment.save();

        await this.bookingService.markAsFailed(payment.bookingId.toString());
        break;
      }

      default:
        // ignore other events
        break;
    }
  }

  async getPaymentByBookingId(bookingId: string) {
    if (!Types.ObjectId.isValid(bookingId)) {
      throw new BadRequestException('Invalid bookingId');
    }

    const payment = await this.paymentModel
      .findOne({
        bookingId: new Types.ObjectId(bookingId),
      })
      .lean();

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async getPaymentById(paymentId: string) {
    if (!Types.ObjectId.isValid(paymentId)) {
      throw new BadRequestException('Invalid paymentId');
    }

    const payment = await this.paymentModel.findById(paymentId).lean();

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async getPaymentStatus(bookingId: string) {
    if (!Types.ObjectId.isValid(bookingId)) {
      throw new BadRequestException('Invalid bookingId');
    }

    const payment = await this.paymentModel
      .findOne({
        bookingId: new Types.ObjectId(bookingId),
      })
      .select('status amount currency refundedAmount createdAt')
      .lean();

    if (!payment) {
      return {
        exists: false,
        status: null,
      };
    }

    const paymentWithTimestamps = payment as typeof payment & {
      createdAt: Date;
    };

    return {
      exists: true,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      refundedAmount: payment.refundedAmount ?? 0,
      createdAt: paymentWithTimestamps.createdAt,
    };
  }

  async refund(bookingId: string, amount?: number) {
    const payment = await this.paymentModel.findOne({
      bookingId: new Types.ObjectId(bookingId),
      status: {
        $in: [PaymentStatus.SUCCEEDED, PaymentStatus.REFUNDED],
      },
    });

    if (!payment) {
      throw new BadRequestException('No refundable payment found');
    }

    const alreadyRefunded = payment.refundedAmount ?? 0;
    const remaining = payment.amount - alreadyRefunded;

    if (remaining <= 0) {
      throw new BadRequestException('Payment already fully refunded');
    }

    const refundAmount = amount ?? remaining;

    if (refundAmount > remaining) {
      throw new BadRequestException('Refund amount exceeds remaining balance');
    }

    const refund = await stripe.refunds.create({
      payment_intent: payment.intentId, // hoặc intentId
      amount: Math.round(refundAmount),
    });

    payment.refundedAmount = alreadyRefunded + refundAmount;

    payment.status =
      payment.refundedAmount >= payment.amount
        ? PaymentStatus.FULLY_REFUNDED
        : PaymentStatus.REFUNDED;

    await payment.save();

    await this.bookingService.markAsRefunded(
      bookingId,
      payment.status === PaymentStatus.FULLY_REFUNDED,
    );

    return refund;
  }
}
