import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Stripe from 'stripe';
import { BookingService } from '../booking/booking.service';
import { TourBookingService } from '../tour-booking/tour-booking.service';
import { stripe } from '../stripe.service';
import {
  Payment,
  PaymentDocument,
  PaymentStatus,
} from './schema/payment.schema';
import { BookingPaymentStatus } from 'src/booking/schema/booking.schema';
import {
  TourBookingStatus,
  TourPaymentStatus,
} from 'src/tour-booking/schema/tour-booking.schema';

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    private readonly bookingService: BookingService,
    private readonly tourBookingService: TourBookingService,
  ) {}

  async createPaymentIntent(bookingId: string) {
    if (!Types.ObjectId.isValid(bookingId)) {
      throw new BadRequestException('Invalid bookingId');
    }

    const booking = await this.bookingService.findOne(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.paymentStatus === BookingPaymentStatus.EXPIRED) {
      throw new BadRequestException('Booking has expired');
    }
    if (booking.paymentStatus !== BookingPaymentStatus.UNPAID) {
      throw new BadRequestException('Booking already paid');
    }

    let intent: Stripe.PaymentIntent;
    try {
      intent = await stripe.paymentIntents.create({
        amount: Math.round(booking.amount),
        currency: (booking.currency || 'vnd').toLowerCase(),
        metadata: {
          bookingId: String(booking._id),
        },
      });
    } catch (err: unknown) {
      const stripeErr = err as Stripe.errors.StripeError;
      const message =
        stripeErr?.message ||
        (err instanceof Error ? err.message : 'Stripe payment failed');
      throw new BadRequestException(
        `Cannot create payment: ${message}. Check STRIPE_SECRET_KEY and currency support (e.g. VND) in your Stripe account.`,
      );
    }

    const payment = new this.paymentModel({
      bookingId: booking._id,
      provider: 'STRIPE',
      intentId: intent.id,
      providerRef: intent.id,
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

  /**
   * Tạo Stripe Payment Intent cho đơn tour.
   * Số tiền charge: depositAmount (nếu có) hoặc totalAmount.
   */
  async createPaymentIntentForTour(tourBookingId: string) {
    if (!Types.ObjectId.isValid(tourBookingId)) {
      throw new BadRequestException('Invalid tourBookingId');
    }

    const tourBooking = await this.tourBookingService.getById(tourBookingId);
    if (!tourBooking) {
      throw new NotFoundException('Tour booking not found');
    }

    const doc = tourBooking as unknown as {
      _id: Types.ObjectId;
      status: TourBookingStatus;
      paymentStatus?: TourPaymentStatus;
      depositAmount: number;
      totalAmount: number;
      currency?: string;
    };

    if (doc.status === TourBookingStatus.PAID) {
      throw new BadRequestException('Tour booking already paid');
    }
    if (doc.status === TourBookingStatus.CANCELLED) {
      throw new BadRequestException('Cannot pay a cancelled tour booking');
    }
    if (doc.paymentStatus === TourPaymentStatus.EXPIRED) {
      throw new BadRequestException('Tour booking has expired');
    }

    const amountToCharge =
      doc.depositAmount > 0 ? doc.depositAmount : doc.totalAmount;
    const currency = (doc.currency ?? 'VND').toLowerCase();

    let intent: Stripe.PaymentIntent;
    try {
      intent = await stripe.paymentIntents.create({
        amount: Math.round(amountToCharge),
        currency,
        metadata: {
          tourBookingId: String(doc._id),
        },
      });
    } catch (err: unknown) {
      const stripeErr = err as Stripe.errors.StripeError;
      const message =
        stripeErr?.message ||
        (err instanceof Error ? err.message : 'Stripe payment failed');
      throw new BadRequestException(
        `Cannot create payment: ${message}. Check STRIPE_SECRET_KEY and currency support (e.g. VND) in your Stripe account.`,
      );
    }

    const payment = new this.paymentModel({
      tourBookingId: new Types.ObjectId(tourBookingId),
      provider: 'STRIPE',
      intentId: intent.id,
      providerRef: intent.id,
      amount: amountToCharge,
      currency: doc.currency ?? 'VND',
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

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object;
        const payment = await this.paymentModel.findOne({
          intentId: intent.id,
        });
        if (!payment) return;

        payment.status = PaymentStatus.SUCCEEDED;
        payment.processedAt = new Date();
        await payment.save();

        if (payment.bookingId) {
          await this.bookingService.markAsPaid(payment.bookingId.toString());
        } else if (payment.tourBookingId) {
          await this.tourBookingService.markAsPaid(
            payment.tourBookingId.toString(),
            payment.amount,
            payment.intentId,
          );
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        const payment = await this.paymentModel.findOne({
          intentId: intent.id,
        });
        if (!payment) return;

        payment.status = PaymentStatus.FAILED;
        payment.processedAt = new Date();
        await payment.save();

        if (payment.bookingId) {
          await this.bookingService.markAsFailed(payment.bookingId.toString());
        } else if (payment.tourBookingId) {
          await this.tourBookingService.markAsFailed(
            payment.tourBookingId.toString(),
          );
        }
        break;
      }

      default:
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

  async getPaymentByTourBookingId(tourBookingId: string) {
    if (!Types.ObjectId.isValid(tourBookingId)) {
      throw new BadRequestException('Invalid tourBookingId');
    }

    const payment = await this.paymentModel
      .findOne({
        tourBookingId: new Types.ObjectId(tourBookingId),
      })
      .sort({ createdAt: -1 })
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

  async getPaymentStatusByTourBookingId(tourBookingId: string) {
    if (!Types.ObjectId.isValid(tourBookingId)) {
      throw new BadRequestException('Invalid tourBookingId');
    }

    const payment = await this.paymentModel
      .findOne({
        tourBookingId: new Types.ObjectId(tourBookingId),
      })
      .sort({ createdAt: -1 })
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
