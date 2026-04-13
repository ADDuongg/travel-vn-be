import { Test, TestingModule } from '@nestjs/testing';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';

describe('BookingController', () => {
  let controller: BookingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingController],
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
    }).compile();

    controller = module.get<BookingController>(BookingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
