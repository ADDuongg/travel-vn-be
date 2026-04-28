import { Test, TestingModule } from '@nestjs/testing';
import { PaymentClientController } from './payment.client.controller';
import { PaymentService } from './payment.service';
import { IdempotencyService } from 'src/idempotency/idempotency.service';

describe('PaymentClientController', () => {
  let controller: PaymentClientController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentClientController],
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

    controller = module.get<PaymentClientController>(PaymentClientController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
