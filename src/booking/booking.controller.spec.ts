import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CrudAuditInterceptor } from 'src/audit-log/interceptors/crud-audit.interceptor';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { BookingClientController } from './booking.client.controller';
import { BookingService } from './booking.service';

const noopAuditInterceptor = {
  intercept(_ctx: ExecutionContext, next: CallHandler) {
    return next.handle();
  },
};

describe('BookingClientController', () => {
  let controller: BookingClientController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingClientController],
      providers: [
        {
          provide: BookingService,
          useValue: {
            createRoomBooking: jest.fn(),
            getAllBookings: jest.fn(),
            createTourBooking: jest.fn(),
            getBookingsByUser: jest.fn(),
            getBookingByUserAndId: jest.fn(),
            uploadReceipt: jest.fn(),
            verifyReceipt: jest.fn(),
            markAsPaid: jest.fn(),
            getBookingByIdForAdmin: jest.fn(),
            update: jest.fn(),
            cancel: jest.fn(),
            markAsRefunded: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideInterceptor(CrudAuditInterceptor)
      .useValue(noopAuditInterceptor)
      .compile();

    controller = module.get<BookingClientController>(BookingClientController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
