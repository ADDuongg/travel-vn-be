import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { IdempotencyService } from 'src/idempotency/idempotency.service';

describe('PaymentController', () => {
  let controller: PaymentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        {
          provide: PaymentService,
          useValue: {
            createPaymentIntent: jest.fn(),
            createPaymentIntentForTour: jest.fn(),
            getPaymentStatusByTourBookingId: jest.fn(),
            getPaymentStatus: jest.fn(),
            getPaymentByBookingId: jest.fn(),
            getPaymentByTourBookingId: jest.fn(),
            getPaymentById: jest.fn(),
            handleStripeWebhook: jest.fn(),
            refund: jest.fn(),
          },
        },
        {
          provide: IdempotencyService,
          useValue: {
            execute: jest.fn(
              (
                _key: string,
                _userId: string,
                _endpoint: string,
                fn: () => unknown,
              ) => fn(),
            ),
          },
        },
      ],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
