import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';

import { BookingService } from './booking.service';
import {
  Booking,
  BookingPaymentStatus,
  BookingStatus,
  BookingType,
} from './schema/booking.schema';
import { RoomService } from '../room/room.service';
import { RoomInventoryService } from 'src/room-inventory/room-inventory.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

/* ────────── room fixture ────────── */
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

/* ────────── booking fixture ────────── */
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

/* ────────── mocks ────────── */
const mockBookingModel = {
  findById: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
  prototype: { save: jest.fn() },
};

function makeModelConstructor(instance: any) {
  const ctor: any = jest.fn().mockImplementation(() => instance);
  ctor.findById = mockBookingModel.findById;
  ctor.find = mockBookingModel.find;
  ctor.countDocuments = mockBookingModel.countDocuments;
  ctor.create = mockBookingModel.create;
  return ctor;
}

const mockRoomService = { findOne: jest.fn() };
const mockRoomInventoryService = {
  ensureInventoryExists: jest.fn().mockResolvedValue(undefined),
  checkAvailability: jest.fn().mockResolvedValue(true),
  reserveInventoryRange: jest.fn().mockResolvedValue(undefined),
  rollbackInventoryRange: jest.fn().mockResolvedValue(undefined),
};
const mockCloudinaryService = { uploadFile: jest.fn() };

describe('BookingService', () => {
  let service: BookingService;
  let bookingModelCtor: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: getModelToken(Booking.name), useValue: mockBookingModel },
        { provide: RoomService, useValue: mockRoomService },
        { provide: RoomInventoryService, useValue: mockRoomInventoryService },
        { provide: CloudinaryService, useValue: mockCloudinaryService },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    bookingModelCtor = module.get(getModelToken(Booking.name));
  });

  /* ────────── shared DTO fixture ────────── */
  const baseDto = {
    roomId: roomId.toString(),
    checkIn: '2030-06-10',
    checkOut: '2030-06-12',
    rooms: [{ adults: 2, children: 0 }],
  };

  /* ═══════════════════════════════════════════════
     Pricing helpers (tested through createRoomBooking)
  ═══════════════════════════════════════════════ */
  describe('calcRoomNightPrice via createRoomBooking', () => {
    it('throws NotFoundException when room does not exist', async () => {
      mockRoomService.findOne.mockResolvedValue(null);

      await expect(service.createRoomBooking(baseDto, 'uid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when checkIn === checkOut (0 nights)', async () => {
      mockRoomService.findOne.mockResolvedValue(mockRoom);

      await expect(
        service.createRoomBooking(
          { ...baseDto, checkIn: '2030-06-10', checkOut: '2030-06-10' },
          'uid',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when nights < minNights', async () => {
      mockRoomService.findOne.mockResolvedValue({
        ...mockRoom,
        bookingConfig: { minNights: 3, maxNights: 14 },
      });

      // checkIn → checkOut = 2 nights, minNights = 3
      await expect(
        service.createRoomBooking(
          { ...baseDto, checkIn: '2030-06-10', checkOut: '2030-06-12' },
          'uid',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when nights > maxNights', async () => {
      mockRoomService.findOne.mockResolvedValue({
        ...mockRoom,
        bookingConfig: { minNights: 1, maxNights: 1 },
      });

      // 2 nights but maxNights = 1
      await expect(
        service.createRoomBooking(
          { ...baseDto, checkIn: '2030-06-10', checkOut: '2030-06-12' },
          'uid',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when room is not available', async () => {
      mockRoomService.findOne.mockResolvedValue(mockRoom);
      mockRoomInventoryService.checkAvailability.mockResolvedValue(false);

      await expect(service.createRoomBooking(baseDto, 'uid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('calculates amount correctly: basePrice * nights for base capacity', async () => {
      mockRoomService.findOne.mockResolvedValue(mockRoom);
      mockRoomInventoryService.checkAvailability.mockResolvedValue(true);

      const savedBooking = makeBooking();
      savedBooking.save.mockResolvedValue(savedBooking);
      const ctor = makeModelConstructor(savedBooking);
      (service as any).bookingModel = ctor;

      await service.createRoomBooking(baseDto, '000000000000000000000002');

      // 2 adults within base (2), 0 children → price = 1_000_000 per night × 2 nights = 2_000_000
      expect(ctor).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 2_000_000 }),
      );
    });

    it('adds extra adult charge when adults exceed base capacity', async () => {
      mockRoomService.findOne.mockResolvedValue(mockRoom);

      const savedBooking = makeBooking({ amount: 0 });
      savedBooking.save.mockResolvedValue(savedBooking);
      const ctor = makeModelConstructor(savedBooking);
      (service as any).bookingModel = ctor;

      const dto = { ...baseDto, rooms: [{ adults: 3, children: 0 }] }; // 1 extra adult
      await service.createRoomBooking(dto, '000000000000000000000002');

      // 1 extra adult * 200_000 extra = 1_200_000 per night × 2 nights = 2_400_000
      expect(ctor).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 2_400_000 }),
      );
    });

    it('throws BadRequestException when guests exceed max capacity', async () => {
      mockRoomService.findOne.mockResolvedValue(mockRoom);

      // maxAdults=3, maxChildren=2 → total=5; 4 adults already exceeds maxAdults
      const dto = { ...baseDto, rooms: [{ adults: 4, children: 0 }] };

      await expect(service.createRoomBooking(dto, 'uid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  /* ═══════════════════════════════════════════════
     applySale (indirect tests)
  ═══════════════════════════════════════════════ */
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
      savedBooking.save.mockResolvedValue(savedBooking);
      const ctor = makeModelConstructor(savedBooking);
      (service as any).bookingModel = ctor;

      await service.createRoomBooking(
        { ...baseDto, rooms: [{ adults: 2, children: 0 }] },
        '000000000000000000000002',
      );

      // 50% off 1_000_000 = 500_000 × 2 nights = 1_000_000
      expect(ctor).toHaveBeenCalledWith(
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
          endDate: new Date('2020-01-01'), // in the past
        },
      };
      mockRoomService.findOne.mockResolvedValue(roomExpiredSale);

      const savedBooking = makeBooking({ amount: 0 });
      savedBooking.save.mockResolvedValue(savedBooking);
      const ctor = makeModelConstructor(savedBooking);
      (service as any).bookingModel = ctor;

      await service.createRoomBooking(
        { ...baseDto, rooms: [{ adults: 2, children: 0 }] },
        '000000000000000000000002',
      );

      // Sale expired → full price 1_000_000 × 2 nights = 2_000_000
      expect(ctor).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 2_000_000 }),
      );
    });
  });

  /* ═══════════════════════════════════════════════
     cancel
  ═══════════════════════════════════════════════ */
  describe('cancel', () => {
    const ownerId = '000000000000000000000002';

    it('throws NotFoundException when booking not found', async () => {
      mockBookingModel.findById.mockResolvedValue(null);

      await expect(service.cancel('bookingId', ownerId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when requester is not owner or admin', async () => {
      const booking = makeBooking();
      mockBookingModel.findById.mockResolvedValue(booking);

      await expect(
        service.cancel(booking._id.toString(), 'other_user_id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when booking is already paid', async () => {
      const booking = makeBooking({ paymentStatus: BookingPaymentStatus.PAID });
      mockBookingModel.findById.mockResolvedValue(booking);

      await expect(
        service.cancel(booking._id.toString(), ownerId),
      ).rejects.toThrow(BadRequestException);
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
      mockBookingModel.findById.mockResolvedValue(booking);

      await service.cancel(booking._id.toString(), ownerId);

      expect(
        mockRoomInventoryService.rollbackInventoryRange,
      ).toHaveBeenCalledWith(roomId, futureCheckIn, futureCheckOut, 1);
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
      mockBookingModel.findById.mockResolvedValue(booking);

      await service.cancel(booking._id.toString(), ownerId);

      expect(
        mockRoomInventoryService.rollbackInventoryRange,
      ).not.toHaveBeenCalled();
    });

    it('allows admin to cancel any booking', async () => {
      const booking = makeBooking();
      mockBookingModel.findById.mockResolvedValue(booking);

      await service.cancel(booking._id.toString(), 'admin_user_id', 'admin');

      expect(booking.status).toBe(BookingStatus.CANCELLED);
    });
  });

  /* ═══════════════════════════════════════════════
     markAsPaid
  ═══════════════════════════════════════════════ */
  describe('markAsPaid', () => {
    it('throws NotFoundException when booking not found', async () => {
      mockBookingModel.findById.mockResolvedValue(null);

      await expect(service.markAsPaid('invalid_id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('sets status=CONFIRMED and paymentStatus=PAID', async () => {
      const booking = makeBooking();
      mockBookingModel.findById.mockResolvedValue(booking);

      await service.markAsPaid(booking._id.toString());

      expect(booking.status).toBe(BookingStatus.CONFIRMED);
      expect(booking.paymentStatus).toBe(BookingPaymentStatus.PAID);
      expect(booking.save).toHaveBeenCalled();
    });
  });

  /* ═══════════════════════════════════════════════
     markAsFailed
  ═══════════════════════════════════════════════ */
  describe('markAsFailed', () => {
    it('throws NotFoundException when booking not found', async () => {
      mockBookingModel.findById.mockResolvedValue(null);

      await expect(service.markAsFailed('invalid_id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('sets status=CANCELLED and paymentStatus=FAILED', async () => {
      const booking = makeBooking({ status: BookingStatus.PENDING });
      mockBookingModel.findById.mockResolvedValue(booking);

      await service.markAsFailed(booking._id.toString());

      expect(booking.status).toBe(BookingStatus.CANCELLED);
      expect(booking.paymentStatus).toBe(BookingPaymentStatus.FAILED);
    });

    it('does not change booking if status is not PENDING (idempotent)', async () => {
      const booking = makeBooking({ status: BookingStatus.CONFIRMED });
      mockBookingModel.findById.mockResolvedValue(booking);

      await service.markAsFailed(booking._id.toString());

      expect(booking.save).not.toHaveBeenCalled();
    });
  });

  /* ═══════════════════════════════════════════════
     markAsRefunded
  ═══════════════════════════════════════════════ */
  describe('markAsRefunded', () => {
    it('throws NotFoundException when booking not found', async () => {
      mockBookingModel.findById.mockResolvedValue(null);

      await expect(service.markAsRefunded('invalid_id', true)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('sets paymentStatus=REFUNDED for partial refund', async () => {
      const booking = makeBooking();
      mockBookingModel.findById.mockResolvedValue(booking);

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
      mockBookingModel.findById.mockResolvedValue(booking);

      await service.markAsRefunded(booking._id.toString(), true);

      expect(
        mockRoomInventoryService.rollbackInventoryRange,
      ).toHaveBeenCalled();
      expect(booking.status).toBe(BookingStatus.CANCELLED);
    });
  });

  /* ═══════════════════════════════════════════════
     update
  ═══════════════════════════════════════════════ */
  describe('update', () => {
    it('throws NotFoundException when booking not found', async () => {
      mockBookingModel.findById.mockResolvedValue(null);

      await expect(service.update('bad_id', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when booking is already PAID', async () => {
      const booking = makeBooking({ paymentStatus: BookingPaymentStatus.PAID });
      mockBookingModel.findById.mockResolvedValue(booking);

      await expect(service.update(booking._id.toString(), {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
