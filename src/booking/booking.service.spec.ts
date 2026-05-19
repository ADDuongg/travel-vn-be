import { Test, TestingModule } from '@nestjs/testing';
import { DomainException } from 'src/common/exceptions';
import { Types } from 'mongoose';

import { BookingService } from './booking.service';
import {
  BookingPaymentStatus,
  BookingStatus,
  BookingType,
} from './schema/booking.schema';
import { RoomService } from '../room/room.service';
import { RoomInventoryService } from 'src/room-inventory/room-inventory.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { BookingRepository } from './booking.repository';
import {
  ForbiddenDomainException,
  NotFoundDomainException,
} from 'src/common/exceptions';
import { DatabaseTransactionService } from 'src/common/database/database-transaction.service';

const roomId = new Types.ObjectId('000000000000000000000001');

const mockRoom = {
  _id: roomId,
  capacity: { baseAdults: 2, baseChildren: 1, maxAdults: 3, maxChildren: 2 },
  pricing: {
    basePrice: 1_000_000,
    currency: 'VND',
    extraAdultPrice: 200_000,
    extraChildPrice: 100_000,
  },
  sale: { isActive: false },
  bookingConfig: { minNights: 1, maxNights: 14 },
  inventory: { totalRooms: 5 },
};

const makeBooking = (overrides: Partial<any> = {}) => ({
  _id: new Types.ObjectId(),
  userId: new Types.ObjectId('000000000000000000000002'),
  bookingType: BookingType.ROOM,
  status: BookingStatus.PENDING,
  paymentStatus: BookingPaymentStatus.UNPAID,
  amount: 2_000_000,
  currency: 'VND',
  rooms: [
    {
      roomId,
      checkIn: new Date('2030-06-10'),
      checkOut: new Date('2030-06-12'),
      guests: { adults: 2, children: 0 },
    },
  ],
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const mockBookingRepository = {
  createRoomBookingDoc: jest.fn(),
  save: jest.fn().mockImplementation((b) => Promise.resolve(b)),
  findManyAdminList: jest.fn(),
  findManyByUser: jest.fn(),
  findOneByUserAndBookingId: jest.fn(),
  findByIdForAdmin: jest.fn(),
  findById: jest.fn(),
  findByIdAsDocument: jest.fn(),
  uploadReceiptFind: jest.fn(),
  verifyReceiptFind: jest.fn(),
  findPendingRoomBookingsToExpire: jest.fn(),
};

const mockRoomService = { findOne: jest.fn() };
const mockRoomInventoryService = {
  ensureInventoryExists: jest.fn().mockResolvedValue(undefined),
  checkAvailability: jest.fn().mockResolvedValue(true),
  reserveInventoryRange: jest.fn().mockResolvedValue(undefined),
  rollbackInventoryRange: jest.fn().mockResolvedValue(undefined),
};
const mockCloudinaryService = { uploadFile: jest.fn() };
const mockTransactionService = {
  runInTransaction: jest.fn().mockImplementation((runner) => runner({})),
};

describe('BookingService', () => {
  let service: BookingService;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockBookingRepository.findByIdAsDocument.mockImplementation((id: string) =>
      mockBookingRepository.findById(id),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: BookingRepository, useValue: mockBookingRepository },
        { provide: RoomService, useValue: mockRoomService },
        { provide: RoomInventoryService, useValue: mockRoomInventoryService },
        { provide: CloudinaryService, useValue: mockCloudinaryService },
        {
          provide: DatabaseTransactionService,
          useValue: mockTransactionService,
        },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
  });

  const baseDto = {
    roomId: roomId.toString(),
    checkIn: '2030-06-10',
    checkOut: '2030-06-12',
    rooms: [{ adults: 2, children: 0 }],
  };

  describe('calcRoomNightPrice via createRoomBooking', () => {
    it('throws NotFoundDomainException when room does not exist', async () => {
      mockRoomService.findOne.mockResolvedValue(null);

      await expect(service.createRoomBooking(baseDto, 'uid')).rejects.toThrow(
        NotFoundDomainException,
      );
    });

    it('throws DomainException when checkIn === checkOut (0 nights)', async () => {
      mockRoomService.findOne.mockResolvedValue(mockRoom);

      await expect(
        service.createRoomBooking(
          { ...baseDto, checkIn: '2030-06-10', checkOut: '2030-06-10' },
          'uid',
        ),
      ).rejects.toThrow(DomainException);
    });

    it('throws DomainException when nights < minNights', async () => {
      mockRoomService.findOne.mockResolvedValue({
        ...mockRoom,
        bookingConfig: { minNights: 3, maxNights: 14 },
      });

      await expect(
        service.createRoomBooking(
          { ...baseDto, checkIn: '2030-06-10', checkOut: '2030-06-12' },
          'uid',
        ),
      ).rejects.toThrow(DomainException);
    });

    it('throws DomainException when nights > maxNights', async () => {
      mockRoomService.findOne.mockResolvedValue({
        ...mockRoom,
        bookingConfig: { minNights: 1, maxNights: 1 },
      });

      await expect(
        service.createRoomBooking(
          { ...baseDto, checkIn: '2030-06-10', checkOut: '2030-06-12' },
          'uid',
        ),
      ).rejects.toThrow(DomainException);
    });

    it('throws DomainException when room is not available', async () => {
      mockRoomService.findOne.mockResolvedValue(mockRoom);
      mockRoomInventoryService.checkAvailability.mockResolvedValue(false);

      await expect(service.createRoomBooking(baseDto, 'uid')).rejects.toThrow(
        DomainException,
      );
    });

    it('calculates amount correctly: basePrice * nights for base capacity', async () => {
      mockRoomService.findOne.mockResolvedValue(mockRoom);
      mockRoomInventoryService.checkAvailability.mockResolvedValue(true);

      const savedBooking = makeBooking();
      mockBookingRepository.createRoomBookingDoc.mockReturnValue(savedBooking);

      await service.createRoomBooking(baseDto, '000000000000000000000002');

      expect(mockBookingRepository.createRoomBookingDoc).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 2_000_000 }),
      );
    });

    it('adds extra adult charge when adults exceed base capacity', async () => {
      mockRoomService.findOne.mockResolvedValue(mockRoom);

      const savedBooking = makeBooking({ amount: 0 });
      mockBookingRepository.createRoomBookingDoc.mockReturnValue(savedBooking);

      const dto = { ...baseDto, rooms: [{ adults: 3, children: 0 }] };
      await service.createRoomBooking(dto, '000000000000000000000002');

      expect(mockBookingRepository.createRoomBookingDoc).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 2_400_000 }),
      );
    });

    it('throws DomainException when guests exceed max capacity', async () => {
      mockRoomService.findOne.mockResolvedValue(mockRoom);

      const dto = { ...baseDto, rooms: [{ adults: 4, children: 0 }] };

      await expect(service.createRoomBooking(dto, 'uid')).rejects.toThrow(
        DomainException,
      );
    });
  });

  describe('applySale via createRoomBooking', () => {
    it('applies percent sale correctly', async () => {
      const roomWithSale = {
        ...mockRoom,
        sale: {
          isActive: true,
          type: 'PERCENT',
          value: 50,
          startDate: null,
          endDate: null,
        },
        pricing: { ...mockRoom.pricing, basePrice: 1_000_000 },
      };
      mockRoomService.findOne.mockResolvedValue(roomWithSale);

      const savedBooking = makeBooking({ amount: 0 });
      mockBookingRepository.createRoomBookingDoc.mockReturnValue(savedBooking);

      await service.createRoomBooking(
        { ...baseDto, rooms: [{ adults: 2, children: 0 }] },
        '000000000000000000000002',
      );

      expect(mockBookingRepository.createRoomBookingDoc).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 1_000_000 }),
      );
    });

    it('does not apply expired sale', async () => {
      const roomExpiredSale = {
        ...mockRoom,
        sale: {
          isActive: true,
          type: 'PERCENT',
          value: 50,
          startDate: null,
          endDate: new Date('2020-01-01'),
        },
      };
      mockRoomService.findOne.mockResolvedValue(roomExpiredSale);

      const savedBooking = makeBooking({ amount: 0 });
      mockBookingRepository.createRoomBookingDoc.mockReturnValue(savedBooking);

      await service.createRoomBooking(
        { ...baseDto, rooms: [{ adults: 2, children: 0 }] },
        '000000000000000000000002',
      );

      expect(mockBookingRepository.createRoomBookingDoc).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 2_000_000 }),
      );
    });
  });

  describe('cancel', () => {
    const ownerId = '000000000000000000000002';

    it('throws NotFoundDomainException when booking not found', async () => {
      mockBookingRepository.findById.mockResolvedValue(null);

      await expect(service.cancel('bookingId', ownerId)).rejects.toThrow(
        NotFoundDomainException,
      );
    });

    it('throws ForbiddenDomainException when requester is not owner or admin', async () => {
      const booking = makeBooking();
      mockBookingRepository.findById.mockResolvedValue(booking);

      await expect(
        service.cancel(booking._id.toString(), 'other_user_id'),
      ).rejects.toThrow(ForbiddenDomainException);
    });

    it('throws DomainException when booking is already paid', async () => {
      const booking = makeBooking({ paymentStatus: BookingPaymentStatus.PAID });
      mockBookingRepository.findById.mockResolvedValue(booking);

      await expect(
        service.cancel(booking._id.toString(), ownerId),
      ).rejects.toThrow(DomainException);
    });

    it('cancels booking and rolls back future inventory', async () => {
      const futureCheckIn = new Date('2035-01-01');
      const futureCheckOut = new Date('2035-01-03');

      const booking = makeBooking({
        rooms: [
          {
            roomId,
            checkIn: futureCheckIn,
            checkOut: futureCheckOut,
            guests: { adults: 2, children: 0 },
          },
        ],
      });
      mockBookingRepository.findById.mockResolvedValue(booking);

      await service.cancel(booking._id.toString(), ownerId);

      expect(
        mockRoomInventoryService.rollbackInventoryRange,
      ).toHaveBeenCalledWith(
        roomId,
        futureCheckIn,
        futureCheckOut,
        1,
        expect.any(Object),
      );
      expect(booking.status).toBe(BookingStatus.CANCELLED);
    });

    it('does NOT roll back inventory when check-in is in the past', async () => {
      const pastCheckIn = new Date('2020-01-01');
      const pastCheckOut = new Date('2020-01-03');

      const booking = makeBooking({
        rooms: [
          {
            roomId,
            checkIn: pastCheckIn,
            checkOut: pastCheckOut,
            guests: { adults: 2, children: 0 },
          },
        ],
      });
      mockBookingRepository.findById.mockResolvedValue(booking);

      await service.cancel(booking._id.toString(), ownerId);

      expect(
        mockRoomInventoryService.rollbackInventoryRange,
      ).not.toHaveBeenCalled();
    });

    it('allows admin to cancel any booking', async () => {
      const booking = makeBooking();
      mockBookingRepository.findById.mockResolvedValue(booking);

      await service.cancel(booking._id.toString(), 'admin_user_id', 'admin');

      expect(booking.status).toBe(BookingStatus.CANCELLED);
    });
  });

  describe('markAsPaid', () => {
    it('throws NotFoundDomainException when booking not found', async () => {
      mockBookingRepository.findById.mockResolvedValue(null);

      await expect(service.markAsPaid('invalid_id')).rejects.toThrow(
        NotFoundDomainException,
      );
    });

    it('sets status=CONFIRMED and paymentStatus=PAID', async () => {
      const booking = makeBooking();
      mockBookingRepository.findById.mockResolvedValue(booking);

      await service.markAsPaid(booking._id.toString());

      expect(booking.status).toBe(BookingStatus.CONFIRMED);
      expect(booking.paymentStatus).toBe(BookingPaymentStatus.PAID);
      expect(mockBookingRepository.save).toHaveBeenCalledWith(
        booking,
        undefined,
      );
    });
  });

  describe('markAsFailed', () => {
    it('throws NotFoundDomainException when booking not found', async () => {
      mockBookingRepository.findById.mockResolvedValue(null);

      await expect(service.markAsFailed('invalid_id')).rejects.toThrow(
        NotFoundDomainException,
      );
    });

    it('sets status=CANCELLED and paymentStatus=FAILED', async () => {
      const booking = makeBooking({ status: BookingStatus.PENDING });
      mockBookingRepository.findById.mockResolvedValue(booking);

      await service.markAsFailed(booking._id.toString());

      expect(booking.status).toBe(BookingStatus.CANCELLED);
      expect(booking.paymentStatus).toBe(BookingPaymentStatus.FAILED);
    });

    it('does not change booking if status is not PENDING (idempotent)', async () => {
      const booking = makeBooking({ status: BookingStatus.CONFIRMED });
      mockBookingRepository.findById.mockResolvedValue(booking);

      await service.markAsFailed(booking._id.toString());

      expect(mockBookingRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('markAsRefunded', () => {
    it('throws NotFoundDomainException when booking not found', async () => {
      mockBookingRepository.findById.mockResolvedValue(null);

      await expect(service.markAsRefunded('invalid_id', true)).rejects.toThrow(
        NotFoundDomainException,
      );
    });

    it('sets paymentStatus=REFUNDED for partial refund', async () => {
      const booking = makeBooking();
      mockBookingRepository.findById.mockResolvedValue(booking);

      await service.markAsRefunded(booking._id.toString(), false);

      expect(booking.paymentStatus).toBe(BookingPaymentStatus.REFUNDED);
      expect(booking.status).not.toBe(BookingStatus.CANCELLED);
    });

    it('sets CANCELLED and rolls back future inventory on full refund', async () => {
      const futureDate = new Date('2035-01-01');
      const booking = makeBooking({
        rooms: [
          {
            roomId,
            checkIn: futureDate,
            checkOut: new Date('2035-01-03'),
            guests: { adults: 2, children: 0 },
          },
        ],
      });
      mockBookingRepository.findById.mockResolvedValue(booking);

      await service.markAsRefunded(booking._id.toString(), true);

      expect(
        mockRoomInventoryService.rollbackInventoryRange,
      ).toHaveBeenCalled();
      expect(booking.status).toBe(BookingStatus.CANCELLED);
    });
  });

  describe('update', () => {
    it('throws NotFoundDomainException when booking not found', async () => {
      mockBookingRepository.findById.mockResolvedValue(null);

      await expect(service.update('bad_id', {})).rejects.toThrow(
        NotFoundDomainException,
      );
    });

    it('throws DomainException when booking is already PAID', async () => {
      const booking = makeBooking({ paymentStatus: BookingPaymentStatus.PAID });
      mockBookingRepository.findById.mockResolvedValue(booking);

      await expect(service.update(booking._id.toString(), {})).rejects.toThrow(
        DomainException,
      );
    });
  });
});
