/* eslint-disable @typescript-eslint/no-floating-promises */
import { BadRequestException, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from 'src/common/exceptions';
import { Types } from 'mongoose';
import Stripe from 'stripe';
import { BookingService } from '../booking/booking.service';
import { TourBookingService } from '../tour-booking/tour-booking.service';
import { stripe } from '../stripe.service';
import { PaymentStatus } from './schema/payment.schema';
import { BookingPaymentStatus } from 'src/booking/schema/booking.schema';
import {
  TourBookingStatus,
  TourPaymentStatus,
} from 'src/tour-booking/schema/tour-booking.schema';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import {
  AuditCategory,
  AuditResourceType,
  PaymentAuditAction,
} from 'src/audit-log/enums/audit-log.enum';
import { PaymentRepository } from './payment.repository';
import { DatabaseTransactionService } from 'src/common/database/database-transaction.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly bookingService: BookingService,
    private readonly tourBookingService: TourBookingService,
    private readonly auditLogService: AuditLogService,
    private readonly transactionService: DatabaseTransactionService,
  ) {}

  async createPaymentIntent(bookingId: string) {
    if (!Types.ObjectId.isValid(bookingId)) {
      throw new BadRequestException('Invalid bookingId');
    }

    const booking = await this.bookingService.findOne(bookingId);
    if (!booking) {
      throw new NotFoundDomainException('Booking not found');
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

    const payment = this.paymentRepository.createNew({
      bookingId: booking._id as Types.ObjectId,
      provider: 'STRIPE',
      intentId: intent.id,
      providerRef: intent.id,
      amount: booking.amount,
      currency: booking.currency,
      status: PaymentStatus.PENDING,
    });

    await this.paymentRepository.save(payment);

    this.auditLogService.log({
      category: AuditCategory.PAYMENT,
      action: PaymentAuditAction.PAYMENT_INTENT_CREATED,
      resourceType: AuditResourceType.PAYMENT,
      resourceId: payment._id,
      metadata: {
        bookingId,
        intentId: intent.id,
        amount: booking.amount,
        currency: booking.currency,
      },
    });

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
      throw new NotFoundDomainException('Tour booking not found');
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

    const payment = this.paymentRepository.createNew({
      tourBookingId: new Types.ObjectId(tourBookingId),
      provider: 'STRIPE',
      intentId: intent.id,
      providerRef: intent.id,
      amount: amountToCharge,
      currency: doc.currency ?? 'VND',
      status: PaymentStatus.PENDING,
    });

    await this.paymentRepository.save(payment);

    this.auditLogService.log({
      category: AuditCategory.PAYMENT,
      action: PaymentAuditAction.PAYMENT_INTENT_CREATED,
      resourceType: AuditResourceType.PAYMENT,
      resourceId: payment._id,
      metadata: {
        tourBookingId,
        intentId: intent.id,
        amount: amountToCharge,
        currency: doc.currency ?? 'VND',
      },
    });

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
        const payment = await this.paymentRepository.findOneByIntentId(
          intent.id,
        );
        if (!payment) return;
        if (
          payment.status === PaymentStatus.SUCCEEDED ||
          payment.status === PaymentStatus.REFUNDED ||
          payment.status === PaymentStatus.FULLY_REFUNDED
        ) {
          return;
        }

        const oldStatus = payment.status;
        await this.transactionService.runInTransaction(async (session) => {
          payment.status = PaymentStatus.SUCCEEDED;
          payment.processedAt = new Date();
          await this.paymentRepository.save(payment, session);

          if (payment.bookingId) {
            await this.bookingService.markAsPaid(
              payment.bookingId.toString(),
              session,
            );
          } else if (payment.tourBookingId) {
            await this.tourBookingService.markAsPaid(
              payment.tourBookingId.toString(),
              payment.amount,
              payment.intentId,
              session,
            );
          }
        });

        this.auditLogService.log({
          category: AuditCategory.PAYMENT,
          action: PaymentAuditAction.PAYMENT_SUCCEEDED,
          resourceType: AuditResourceType.PAYMENT,
          resourceId: payment._id,
          oldValue: { status: oldStatus },
          newValue: { status: PaymentStatus.SUCCEEDED },
          metadata: {
            intentId: intent.id,
            bookingId: payment.bookingId?.toString(),
            tourBookingId: payment.tourBookingId?.toString(),
            amount: payment.amount,
          },
        });
        break;
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        const payment = await this.paymentRepository.findOneByIntentId(
          intent.id,
        );
        if (!payment) return;
        if (payment.status === PaymentStatus.FAILED) {
          return;
        }

        const oldStatus = payment.status;
        await this.transactionService.runInTransaction(async (session) => {
          payment.status = PaymentStatus.FAILED;
          payment.processedAt = new Date();
          await this.paymentRepository.save(payment, session);

          if (payment.bookingId) {
            await this.bookingService.markAsFailed(
              payment.bookingId.toString(),
              session,
            );
          } else if (payment.tourBookingId) {
            await this.tourBookingService.markAsFailed(
              payment.tourBookingId.toString(),
              session,
            );
          }
        });

        this.auditLogService.log({
          category: AuditCategory.PAYMENT,
          action: PaymentAuditAction.PAYMENT_FAILED,
          resourceType: AuditResourceType.PAYMENT,
          resourceId: payment._id,
          oldValue: { status: oldStatus },
          newValue: { status: PaymentStatus.FAILED },
          metadata: {
            intentId: intent.id,
            bookingId: payment.bookingId?.toString(),
            tourBookingId: payment.tourBookingId?.toString(),
          },
        });
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

    const payment = await this.paymentRepository.findOneByBookingId(
      new Types.ObjectId(bookingId),
    );

    if (!payment) {
      throw new NotFoundDomainException('Payment not found');
    }

    return payment;
  }

  async getPaymentByTourBookingId(tourBookingId: string) {
    if (!Types.ObjectId.isValid(tourBookingId)) {
      throw new BadRequestException('Invalid tourBookingId');
    }

    const payment = await this.paymentRepository.findLatestByTourBookingId(
      new Types.ObjectId(tourBookingId),
    );

    if (!payment) {
      throw new NotFoundDomainException('Payment not found');
    }

    return payment;
  }

  async getPaymentById(paymentId: string) {
    if (!Types.ObjectId.isValid(paymentId)) {
      throw new BadRequestException('Invalid paymentId');
    }

    const payment = await this.paymentRepository.findByIdLean(
      new Types.ObjectId(paymentId),
    );

    if (!payment) {
      throw new NotFoundDomainException('Payment not found');
    }

    return payment;
  }

  async getPaymentStatus(bookingId: string) {
    if (!Types.ObjectId.isValid(bookingId)) {
      throw new BadRequestException('Invalid bookingId');
    }

    const payment = await this.paymentRepository.findStatusByBookingId(
      new Types.ObjectId(bookingId),
    );

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

    const payment = await this.paymentRepository.findStatusByTourBookingId(
      new Types.ObjectId(tourBookingId),
    );

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
    const payment = await this.paymentRepository.findRefundableByBookingId(
      new Types.ObjectId(bookingId),
    );

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
      payment_intent: payment.intentId,
      amount: Math.round(refundAmount),
    });

    await this.transactionService.runInTransaction(async (session) => {
      payment.refundedAmount = alreadyRefunded + refundAmount;

      payment.status =
        payment.refundedAmount >= payment.amount
          ? PaymentStatus.FULLY_REFUNDED
          : PaymentStatus.REFUNDED;

      await this.paymentRepository.save(payment, session);

      await this.bookingService.markAsRefunded(
        bookingId,
        payment.status === PaymentStatus.FULLY_REFUNDED,
        session,
      );
    });

    this.auditLogService.log({
      category: AuditCategory.PAYMENT,
      action: PaymentAuditAction.PAYMENT_REFUNDED,
      resourceType: AuditResourceType.PAYMENT,
      resourceId: payment._id,
      oldValue: {
        refundedAmount: alreadyRefunded,
        status: PaymentStatus.SUCCEEDED,
      },
      newValue: {
        refundedAmount: payment.refundedAmount,
        status: payment.status,
      },
      metadata: {
        bookingId,
        refundAmount,
        stripeRefundId: refund.id,
      },
    });

    return refund;
  }
}
