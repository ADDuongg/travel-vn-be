import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

import { PaymentService } from './payment.service';
import { Payment, PaymentStatus } from './schema/payment.schema';
import { BookingService } from '../booking/booking.service';
import { TourBookingService } from '../tour-booking/tour-booking.service';
import { BookingPaymentStatus } from 'src/booking/schema/booking.schema';

/* ────────── mock stripe module ────────── */
const mockStripe = {
  paymentIntents: { create: jest.fn() },
  webhooks: { constructEvent: jest.fn() },
  refunds: { create: jest.fn() },
};

jest.mock('../stripe.service', () => ({
  stripe: {
    paymentIntents: { create: jest.fn() },
    webhooks: { constructEvent: jest.fn() },
    refunds: { create: jest.fn() },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const stripeModule = require('../stripe.service');

/* ────────── helpers ────────── */
const bookingId = new Types.ObjectId('000000000000000000000001');
const tourBookingId = new Types.ObjectId('000000000000000000000002');

const makePayment = (overrides: Partial<any> = {}) => ({
  _id: new Types.ObjectId(),
  bookingId,
  intentId: 'pi_test_123',
  providerRef: 'pi_test_123',
  amount: 500_000,
  currency: 'VND',
  status: PaymentStatus.PENDING,
  refundedAmount: 0,
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

/* ────────── mocks ────────── */
const mockPaymentModel = {
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  prototype: { save: jest.fn() },
};

function makeModelCtor(instance: any) {
  const ctor = jest.fn().mockImplementation(() => instance);
  Object.assign(ctor, mockPaymentModel);
  return ctor;
}

const mockBookingService = {
  findOne: jest.fn(),
  markAsPaid: jest.fn().mockResolvedValue(undefined),
  markAsFailed: jest.fn().mockResolvedValue(undefined),
  markAsRefunded: jest.fn().mockResolvedValue(undefined),
};

const mockTourBookingService = {
  getById: jest.fn(),
  markAsPaid: jest.fn().mockResolvedValue(undefined),
  markAsFailed: jest.fn().mockResolvedValue(undefined),
};

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // reset stripe mock
    stripeModule.stripe.paymentIntents.create = jest.fn();
    stripeModule.stripe.webhooks.constructEvent = jest.fn();
    stripeModule.stripe.refunds.create = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: getModelToken(Payment.name), useValue: mockPaymentModel },
        { provide: BookingService, useValue: mockBookingService },
        { provide: TourBookingService, useValue: mockTourBookingService },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    // inject model ctor so `new this.paymentModel(...)` works
    (service as any).paymentModel = makeModelCtor(makePayment());
  });

  /* ═══════════════════════════════════════════════
     createPaymentIntent
  ═══════════════════════════════════════════════ */
  describe('createPaymentIntent', () => {
    it('throws BadRequestException for invalid bookingId format', async () => {
      await expect(service.createPaymentIntent('not-valid-id')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when booking not found', async () => {
      mockBookingService.findOne.mockResolvedValue(null);

      await expect(service.createPaymentIntent(bookingId.toString())).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when booking is EXPIRED', async () => {
      mockBookingService.findOne.mockResolvedValue({
        paymentStatus: BookingPaymentStatus.EXPIRED,
      });

      await expect(service.createPaymentIntent(bookingId.toString())).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when booking is already PAID', async () => {
      mockBookingService.findOne.mockResolvedValue({
        paymentStatus: BookingPaymentStatus.PAID,
      });

      await expect(service.createPaymentIntent(bookingId.toString())).rejects.toThrow(BadRequestException);
    });

    it('creates stripe intent and saves payment record on success', async () => {
      const booking = { _id: bookingId, paymentStatus: BookingPaymentStatus.UNPAID, amount: 500_000, currency: 'VND' };
      mockBookingService.findOne.mockResolvedValue(booking);
      stripeModule.stripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'secret_abc',
      });

      const savedPayment = makePayment();
      savedPayment.save.mockResolvedValue(savedPayment);
      (service as any).paymentModel = makeModelCtor(savedPayment);

      const result = await service.createPaymentIntent(bookingId.toString());

      expect(stripeModule.stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 500_000,
          metadata: { bookingId: bookingId.toString() },
        }),
      );
      expect(result.clientSecret).toBe('secret_abc');
    });
  });

  /* ═══════════════════════════════════════════════
     handleStripeWebhook
  ═══════════════════════════════════════════════ */
  describe('handleStripeWebhook', () => {
    it('marks payment SUCCEEDED and booking paid on payment_intent.succeeded', async () => {
      const payment = makePayment({ status: PaymentStatus.PENDING, bookingId });
      stripeModule.stripe.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_123' } },
      });
      mockPaymentModel.findOne.mockResolvedValue(payment);

      await service.handleStripeWebhook('sig', Buffer.from('payload'));

      expect(payment.status).toBe(PaymentStatus.SUCCEEDED);
      expect(payment.save).toHaveBeenCalled();
      expect(mockBookingService.markAsPaid).toHaveBeenCalledWith(bookingId.toString());
    });

    it('marks payment FAILED and booking failed on payment_intent.payment_failed', async () => {
      const payment = makePayment({ status: PaymentStatus.PENDING, bookingId });
      stripeModule.stripe.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.payment_failed',
        data: { object: { id: 'pi_test_123' } },
      });
      mockPaymentModel.findOne.mockResolvedValue(payment);

      await service.handleStripeWebhook('sig', Buffer.from('payload'));

      expect(payment.status).toBe(PaymentStatus.FAILED);
      expect(mockBookingService.markAsFailed).toHaveBeenCalledWith(bookingId.toString());
    });

    it('calls tourBookingService when payment has tourBookingId', async () => {
      const payment = makePayment({
        bookingId: undefined,
        tourBookingId,
        status: PaymentStatus.PENDING,
        intentId: 'pi_tour_123',
      });
      stripeModule.stripe.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_tour_123' } },
      });
      mockPaymentModel.findOne.mockResolvedValue(payment);

      await service.handleStripeWebhook('sig', Buffer.from('payload'));

      expect(mockTourBookingService.markAsPaid).toHaveBeenCalledWith(
        tourBookingId.toString(),
        payment.amount,
        payment.intentId,
      );
      expect(mockBookingService.markAsPaid).not.toHaveBeenCalled();
    });

    it('silently returns when payment record not found (no duplicate processing)', async () => {
      stripeModule.stripe.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_unknown' } },
      });
      mockPaymentModel.findOne.mockResolvedValue(null);

      await expect(service.handleStripeWebhook('sig', Buffer.from('payload'))).resolves.not.toThrow();
    });

    it('ignores unknown event types without error', async () => {
      stripeModule.stripe.webhooks.constructEvent.mockReturnValue({
        type: 'charge.updated',
        data: { object: {} },
      });

      await expect(service.handleStripeWebhook('sig', Buffer.from('payload'))).resolves.not.toThrow();
    });
  });

  /* ═══════════════════════════════════════════════
     refund
  ═══════════════════════════════════════════════ */
  describe('refund', () => {
    it('throws BadRequestException when no refundable payment found', async () => {
      mockPaymentModel.findOne.mockResolvedValue(null);

      await expect(service.refund(bookingId.toString())).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when payment is already fully refunded', async () => {
      mockPaymentModel.findOne.mockResolvedValue(
        makePayment({ amount: 500_000, refundedAmount: 500_000 }),
      );

      await expect(service.refund(bookingId.toString())).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when requested refund exceeds remaining', async () => {
      mockPaymentModel.findOne.mockResolvedValue(
        makePayment({ amount: 500_000, refundedAmount: 400_000 }),
      );

      // Only 100_000 remaining, requesting 200_000
      await expect(service.refund(bookingId.toString(), 200_000)).rejects.toThrow(BadRequestException);
    });

    it('creates stripe refund and marks payment FULLY_REFUNDED', async () => {
      const payment = makePayment({ amount: 500_000, refundedAmount: 0, status: PaymentStatus.SUCCEEDED });
      mockPaymentModel.findOne.mockResolvedValue(payment);
      stripeModule.stripe.refunds.create.mockResolvedValue({ id: 're_test_123' });

      const result = await service.refund(bookingId.toString());

      expect(stripeModule.stripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 500_000 }),
      );
      expect(payment.refundedAmount).toBe(500_000);
      expect(payment.status).toBe(PaymentStatus.FULLY_REFUNDED);
      expect(mockBookingService.markAsRefunded).toHaveBeenCalledWith(
        bookingId.toString(),
        true,
      );
      expect(result).toMatchObject({ id: 're_test_123' });
    });

    it('marks payment REFUNDED (not FULLY_REFUNDED) for partial refund', async () => {
      const payment = makePayment({ amount: 500_000, refundedAmount: 0, status: PaymentStatus.SUCCEEDED });
      mockPaymentModel.findOne.mockResolvedValue(payment);
      stripeModule.stripe.refunds.create.mockResolvedValue({ id: 're_partial' });

      await service.refund(bookingId.toString(), 200_000);

      expect(payment.refundedAmount).toBe(200_000);
      expect(payment.status).toBe(PaymentStatus.REFUNDED);
      expect(mockBookingService.markAsRefunded).toHaveBeenCalledWith(
        bookingId.toString(),
        false,
      );
    });
  });
});
