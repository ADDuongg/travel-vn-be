import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import {
  DomainException,
  NotFoundDomainException,
} from 'src/common/exceptions';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import { DatabaseTransactionService } from 'src/common/database/database-transaction.service';
import { PaymentService } from './payment.service';
import { PaymentStatus } from './schema/payment.schema';
import { BookingService } from '../booking/booking.service';
import { TourBookingService } from '../tour-booking/tour-booking.service';
import { BookingPaymentStatus } from 'src/booking/schema/booking.schema';
import { PaymentRepository } from './payment.repository';

jest.mock('../stripe.service', () => ({
  stripe: {
    paymentIntents: { create: jest.fn() },
    webhooks: { constructEvent: jest.fn() },
    refunds: { create: jest.fn() },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const stripeModule = require('../stripe.service');

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

const mockPaymentRepository = {
  createNew: jest.fn(),
  save: jest.fn(),
  findOneByIntentId: jest.fn(),
  findSucceededBefore: jest.fn(),
  findOneByBookingId: jest.fn(),
  findLatestByTourBookingId: jest.fn(),
  findByIdLean: jest.fn(),
  findStatusByBookingId: jest.fn(),
  findStatusByTourBookingId: jest.fn(),
  findRefundableByBookingId: jest.fn(),
  findPendingOlderThan: jest.fn(),
  expirePendingOlderThan: jest.fn(),
};

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

const mockAuditLogService = { log: jest.fn() };
const mockTransactionService = {
  runInTransaction: jest.fn().mockImplementation((runner) => runner({})),
};

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(async () => {
    jest.clearAllMocks();

    stripeModule.stripe.paymentIntents.create = jest.fn();
    stripeModule.stripe.webhooks.constructEvent = jest.fn();
    stripeModule.stripe.refunds.create = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PaymentRepository, useValue: mockPaymentRepository },
        { provide: BookingService, useValue: mockBookingService },
        { provide: TourBookingService, useValue: mockTourBookingService },
        { provide: AuditLogService, useValue: mockAuditLogService },
        {
          provide: DatabaseTransactionService,
          useValue: mockTransactionService,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  describe('createPaymentIntent', () => {
    it('throws DomainException for invalid bookingId format', async () => {
      await expect(service.createPaymentIntent('not-valid-id')).rejects.toThrow(
        DomainException,
      );
    });

    it('throws NotFoundDomainException when booking not found', async () => {
      mockBookingService.findOne.mockResolvedValue(null);

      await expect(
        service.createPaymentIntent(bookingId.toString()),
      ).rejects.toThrow(NotFoundDomainException);
    });

    it('throws DomainException when booking is EXPIRED', async () => {
      mockBookingService.findOne.mockResolvedValue({
        paymentStatus: BookingPaymentStatus.EXPIRED,
      });

      await expect(
        service.createPaymentIntent(bookingId.toString()),
      ).rejects.toThrow(DomainException);
    });

    it('throws DomainException when booking is already PAID', async () => {
      mockBookingService.findOne.mockResolvedValue({
        paymentStatus: BookingPaymentStatus.PAID,
      });

      await expect(
        service.createPaymentIntent(bookingId.toString()),
      ).rejects.toThrow(DomainException);
    });

    it('creates stripe intent and saves payment record on success', async () => {
      const booking = {
        _id: bookingId,
        paymentStatus: BookingPaymentStatus.UNPAID,
        amount: 500_000,
        currency: 'VND',
      };
      mockBookingService.findOne.mockResolvedValue(booking);
      stripeModule.stripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'secret_abc',
      });

      const savedPayment = makePayment();
      mockPaymentRepository.createNew.mockReturnValue(savedPayment);
      mockPaymentRepository.save.mockResolvedValue(savedPayment);

      const result = await service.createPaymentIntent(bookingId.toString());

      expect(stripeModule.stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 500_000,
          metadata: { bookingId: bookingId.toString() },
        }),
      );
      expect(mockPaymentRepository.createNew).toHaveBeenCalled();
      expect(mockPaymentRepository.save).toHaveBeenCalledWith(savedPayment);
      expect(result.clientSecret).toBe('secret_abc');
    });
  });

  describe('handleStripeWebhook', () => {
    it('marks payment SUCCEEDED and booking paid on payment_intent.succeeded', async () => {
      const payment = makePayment({ status: PaymentStatus.PENDING, bookingId });
      stripeModule.stripe.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_123' } },
      });
      mockPaymentRepository.findOneByIntentId.mockResolvedValue(payment);

      await service.handleStripeWebhook('sig', Buffer.from('payload'));

      expect(payment.status).toBe(PaymentStatus.SUCCEEDED);
      expect(mockPaymentRepository.save).toHaveBeenCalledWith(
        payment,
        expect.any(Object),
      );
      expect(mockBookingService.markAsPaid).toHaveBeenCalledWith(
        bookingId.toString(),
        expect.any(Object),
      );
    });

    it('marks payment FAILED and booking failed on payment_intent.payment_failed', async () => {
      const payment = makePayment({ status: PaymentStatus.PENDING, bookingId });
      stripeModule.stripe.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.payment_failed',
        data: { object: { id: 'pi_test_123' } },
      });
      mockPaymentRepository.findOneByIntentId.mockResolvedValue(payment);

      await service.handleStripeWebhook('sig', Buffer.from('payload'));

      expect(payment.status).toBe(PaymentStatus.FAILED);
      expect(mockBookingService.markAsFailed).toHaveBeenCalledWith(
        bookingId.toString(),
        expect.any(Object),
      );
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
      mockPaymentRepository.findOneByIntentId.mockResolvedValue(payment);

      await service.handleStripeWebhook('sig', Buffer.from('payload'));

      expect(mockTourBookingService.markAsPaid).toHaveBeenCalledWith(
        tourBookingId.toString(),
        payment.amount,
        payment.intentId,
        expect.any(Object),
      );
      expect(mockBookingService.markAsPaid).not.toHaveBeenCalled();
    });

    it('silently returns when payment record not found', async () => {
      stripeModule.stripe.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_unknown' } },
      });
      mockPaymentRepository.findOneByIntentId.mockResolvedValue(null);

      await expect(
        service.handleStripeWebhook('sig', Buffer.from('payload')),
      ).resolves.not.toThrow();
    });

    it('ignores unknown event types without error', async () => {
      stripeModule.stripe.webhooks.constructEvent.mockReturnValue({
        type: 'charge.updated',
        data: { object: {} },
      });

      await expect(
        service.handleStripeWebhook('sig', Buffer.from('payload')),
      ).resolves.not.toThrow();
    });
  });

  describe('refund', () => {
    it('throws DomainException when no refundable payment found', async () => {
      mockPaymentRepository.findRefundableByBookingId.mockResolvedValue(null);

      await expect(service.refund(bookingId.toString())).rejects.toThrow(
        DomainException,
      );
    });

    it('throws DomainException when payment is already fully refunded', async () => {
      mockPaymentRepository.findRefundableByBookingId.mockResolvedValue(
        makePayment({ amount: 500_000, refundedAmount: 500_000 }),
      );

      await expect(service.refund(bookingId.toString())).rejects.toThrow(
        DomainException,
      );
    });

    it('throws DomainException when requested refund exceeds remaining', async () => {
      mockPaymentRepository.findRefundableByBookingId.mockResolvedValue(
        makePayment({ amount: 500_000, refundedAmount: 400_000 }),
      );

      await expect(
        service.refund(bookingId.toString(), 200_000),
      ).rejects.toThrow(DomainException);
    });

    it('creates stripe refund and marks payment FULLY_REFUNDED', async () => {
      const payment = makePayment({
        amount: 500_000,
        refundedAmount: 0,
        status: PaymentStatus.SUCCEEDED,
      });
      mockPaymentRepository.findRefundableByBookingId.mockResolvedValue(
        payment,
      );
      mockPaymentRepository.save.mockResolvedValue(payment);
      stripeModule.stripe.refunds.create.mockResolvedValue({
        id: 're_test_123',
      });

      const result = await service.refund(bookingId.toString());

      expect(stripeModule.stripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 500_000 }),
      );
      expect(payment.refundedAmount).toBe(500_000);
      expect(payment.status).toBe(PaymentStatus.FULLY_REFUNDED);
      expect(mockBookingService.markAsRefunded).toHaveBeenCalledWith(
        bookingId.toString(),
        true,
        expect.any(Object),
      );
      expect(result).toMatchObject({ id: 're_test_123' });
    });

    it('marks payment REFUNDED (not FULLY_REFUNDED) for partial refund', async () => {
      const payment = makePayment({
        amount: 500_000,
        refundedAmount: 0,
        status: PaymentStatus.SUCCEEDED,
      });
      mockPaymentRepository.findRefundableByBookingId.mockResolvedValue(
        payment,
      );
      mockPaymentRepository.save.mockResolvedValue(payment);
      stripeModule.stripe.refunds.create.mockResolvedValue({
        id: 're_partial',
      });

      await service.refund(bookingId.toString(), 200_000);

      expect(payment.refundedAmount).toBe(200_000);
      expect(payment.status).toBe(PaymentStatus.REFUNDED);
      expect(mockBookingService.markAsRefunded).toHaveBeenCalledWith(
        bookingId.toString(),
        false,
        expect.any(Object),
      );
    });
  });
});
