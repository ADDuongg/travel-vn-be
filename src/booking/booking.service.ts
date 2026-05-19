import { Injectable } from '@nestjs/common';
import {
  DomainException,
  ForbiddenDomainException,
  NotFoundDomainException,
} from 'src/common/exceptions';
import { withI18nSuccess } from 'src/common/i18n/success-envelope';
import { BookingI18nKeys } from './booking.i18n-keys';
import { ClientSession, Types } from 'mongoose';

import { RoomInventoryService } from 'src/room-inventory/room-inventory.service';
import { parseDateOnly, todayInVietnam } from 'src/utils/date.util';
import { RoomService } from '../room/room.service';
import { Room } from 'src/room/schema/room.schema';
import { BookingQueryDto } from './dto/booking-query.dto';
import { CreateRoomBookingDto } from './dto/create-room-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import {
  Booking,
  BookingPaymentStatus,
  BookingStatus,
  BookingType,
} from './schema/booking.schema';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { BookingRepository } from './booking.repository';
import { DatabaseTransactionService } from 'src/common/database/database-transaction.service';

@Injectable()
export class BookingService {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly roomService: RoomService,
    private readonly roomInventoryService: RoomInventoryService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly transactionService: DatabaseTransactionService,
  ) {}

  private applySale(basePrice: number, sale?: Room['sale']) {
    if (!sale?.isActive) return basePrice;

    const now = new Date();
    if (sale.startDate && new Date(sale.startDate) > now) return basePrice;
    if (sale.endDate && new Date(sale.endDate) < now) return basePrice;

    if (sale.type === 'PERCENT') {
      return Math.max(0, Math.round(basePrice * (1 - sale.value / 100)));
    }

    if (sale.type === 'FIXED') {
      return Math.max(0, basePrice - sale.value);
    }

    return basePrice;
  }

  private calcRoomNightPrice({
    room,
    adults,
    children,
  }: {
    room: Room;
    adults: number;
    children: number;
  }) {
    const capacity = room.capacity || {
      baseAdults: 0,
      baseChildren: 0,
      maxAdults: 0,
      maxChildren: 0,
    };

    const baseAdults = capacity.baseAdults ?? capacity.maxAdults ?? 0;
    const baseChildren = capacity.baseChildren ?? capacity.maxChildren ?? 0;
    const extraAdults = Math.max(0, adults - baseAdults);
    const extraChildren = Math.max(0, children - baseChildren);

    const pricing = room.pricing || {
      basePrice: 0,
      currency: 'VND',
    };

    const discountedBase = this.applySale(pricing.basePrice ?? 0, room.sale);
    const extraAdultPrice = pricing.extraAdultPrice ?? 0;
    const extraChildPrice = pricing.extraChildPrice ?? 0;

    return (
      discountedBase +
      extraAdults * extraAdultPrice +
      extraChildren * extraChildPrice
    );
  }

  async createRoomBooking(dto: CreateRoomBookingDto, userId: string) {
    const room = await this.roomService.findOne(dto.roomId);
    if (!room)
      throw new NotFoundDomainException(
        'Room not found',
        'ROOM_NOT_FOUND',
        BookingI18nKeys.roomNotFound,
      );

    const checkIn = parseDateOnly(dto.checkIn);
    const checkOut = parseDateOnly(dto.checkOut);

    const nights = Math.floor(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (nights <= 0) {
      throw new DomainException(
        'Invalid check-in / check-out',
        400,
        'INVALID_DATES',
        BookingI18nKeys.invalidCheckInOut,
      );
    }

    const minNights = room.bookingConfig?.minNights ?? 1;
    const maxNights = room.bookingConfig?.maxNights;

    if (nights < minNights) {
      throw new DomainException(
        `Minimum stay is ${minNights} nights`,
        400,
        'MIN_NIGHTS',
        BookingI18nKeys.minNights,
      );
    }

    if (maxNights && nights > maxNights) {
      throw new DomainException(
        `Maximum stay is ${maxNights} nights`,
        400,
        'MAX_NIGHTS',
        BookingI18nKeys.maxNights,
      );
    }

    const quantity = dto.rooms.length;

    const totalRooms = room.inventory?.totalRooms;
    if (typeof totalRooms !== 'number') {
      throw new DomainException(
        'Room inventory is not configured',
        400,
        'INVENTORY_NOT_CONFIGURED',
        BookingI18nKeys.inventoryNotConfigured,
      );
    }

    const isAvailable = await this.roomInventoryService.checkAvailability(
      room._id as Types.ObjectId,
      checkIn,
      checkOut,
    );

    if (!isAvailable) {
      throw new DomainException(
        'Room not available',
        400,
        'ROOM_NOT_AVAILABLE',
        BookingI18nKeys.roomNotAvailable,
      );
    }

    if (quantity > totalRooms) {
      throw new DomainException(
        `Only ${totalRooms} rooms available`,
        400,
        'ROOMS_LIMIT',
        BookingI18nKeys.roomsAvailableLimit,
      );
    }

    for (const r of dto.rooms) {
      const totalGuests = r.adults + (r.children ?? 0);
      const maxCapacity =
        (room.capacity?.maxAdults ?? 0) + (room.capacity?.maxChildren ?? 0);

      if (totalGuests > maxCapacity) {
        throw new DomainException(
          'Exceed max guests per room',
          400,
          'EXCEED_GUESTS',
          BookingI18nKeys.exceedMaxGuests,
        );
      }

      if (room.capacity?.maxAdults && r.adults > room.capacity.maxAdults) {
        throw new DomainException(
          `Exceed max adults per room (${room.capacity.maxAdults})`,
          400,
          'EXCEED_ADULTS',
          BookingI18nKeys.exceedMaxAdults,
        );
      }

      if (
        room.capacity?.maxChildren &&
        (r.children ?? 0) > room.capacity.maxChildren
      ) {
        throw new DomainException(
          `Exceed max children per room (${room.capacity.maxChildren})`,
          400,
          'EXCEED_CHILDREN',
          BookingI18nKeys.exceedMaxChildren,
        );
      }
    }

    const roomPrices = dto.rooms.map((r) => {
      const nightlyPrice = this.calcRoomNightPrice({
        room,
        adults: r.adults,
        children: r.children ?? 0,
      });

      return nightlyPrice * nights;
    });

    const amount = roomPrices.reduce((sum, price) => sum + price, 0);

    const bookedRooms = dto.rooms.map((r) => ({
      roomId: room._id as Types.ObjectId,
      checkIn,
      checkOut,
      guests: {
        adults: r.adults,
        children: r.children ?? 0,
      },
    }));

    const booking = this.bookingRepository.createRoomBookingDoc({
      bookingType: BookingType.ROOM,
      status: BookingStatus.PENDING,
      paymentStatus: BookingPaymentStatus.UNPAID,

      amount,
      currency: room.pricing?.currency ?? 'VND',

      rooms: bookedRooms,

      userId: new Types.ObjectId(userId),
    });
    const saved = await this.transactionService.runInTransaction(
      async (session) => {
        await this.roomInventoryService.ensureInventoryExists(
          room._id as Types.ObjectId,
          checkIn,
          checkOut,
          session,
        );
        await this.roomInventoryService.reserveInventoryRange(
          room._id as Types.ObjectId,
          checkIn,
          checkOut,
          quantity,
          session,
        );
        return this.bookingRepository.save(booking, session);
      },
    );
    return withI18nSuccess(
      saved,
      'Booking created successfully',
      BookingI18nKeys.created,
    );
  }

  async getAllBookings(query: BookingQueryDto) {
    const {
      pageIndex = 0,
      pageSize = 10,
      status,
      paymentStatus,
      q,
      sort,
      bookingType = BookingType.ROOM,
    } = query;

    const filter: Record<string, unknown> = {
      bookingType,
    };

    if (status) {
      filter.status = status;
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    if (q) {
      filter.$or = [
        { 'rooms.roomName': { $regex: q, $options: 'i' } },
        { 'tourInfo.title': { $regex: q, $options: 'i' } },
        { 'userId.email': { $regex: q, $options: 'i' } },
      ];
    }

    let mongoSort: Record<string, 1 | -1> = { createdAt: -1 };

    if (sort?.length) {
      mongoSort = {};
      for (const s of sort) {
        if (
          [
            'createdAt',
            'amount',
            'status',
            'paymentStatus',
            'bookingType',
          ].includes(s.by)
        ) {
          mongoSort[s.by] = s.dir === 'asc' ? 1 : -1;
        }
      }
    }

    const skip = pageIndex * pageSize;

    const [items, total] = await this.bookingRepository.findManyAdminList({
      filter,
      mongoSort,
      skip,
      pageSize,
    });

    const formatted = items.map((booking) => ({
      ...booking,
      rooms: booking.rooms.map((r) => ({
        room: r.roomId,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        guests: r.guests,
      })),
    }));

    return {
      data: formatted,
      meta: {
        pageIndex,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize),
      },
    };
  }

  async getBookingsByUser(userId: string, query: BookingQueryDto) {
    const { pageIndex, pageSize, status, paymentStatus, q, sort } = query;

    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };

    if (status) {
      filter.status = status;
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }
    filter.paymentStatus = { $ne: BookingPaymentStatus.EXPIRED };

    if (q) {
      filter.$or = [
        { 'rooms.roomName': { $regex: q, $options: 'i' } },
        { 'tourInfo.title': { $regex: q, $options: 'i' } },
      ];
    }

    let mongoSort: Record<string, 1 | -1> = { createdAt: -1 };

    if (sort?.length) {
      mongoSort = {};
      for (const s of sort) {
        if (['createdAt', 'amount', 'status', 'paymentStatus'].includes(s.by)) {
          mongoSort[s.by] = s.dir === 'asc' ? 1 : -1;
        }
      }
    }

    const skip = pageIndex * pageSize;

    const [items, total] = await this.bookingRepository.findManyByUser({
      filter,
      mongoSort,
      skip,
      pageSize,
    });
    const formatted = items.map((booking) => ({
      ...booking,
      rooms: booking.rooms.map((r) => ({
        room: r.roomId,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        guests: r.guests,
      })),
    }));
    return {
      data: formatted,
      meta: {
        pageIndex,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize),
      },
    };
  }

  async getBookingByUserAndId(userId: string, bookingId: string) {
    const booking = await this.bookingRepository.findOneByUserAndBookingId(
      userId,
      bookingId,
    );

    if (!booking) {
      throw new NotFoundDomainException(
        'Booking not found',
        'BOOKING_NOT_FOUND',
        BookingI18nKeys.bookingNotFound,
      );
    }
    const { userId: bookingUserId, ...rest } = booking;
    const formatted = {
      ...rest,
      rooms: booking.rooms.map((r) => ({
        room: r.roomId,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        guests: r.guests,
      })),
      user: bookingUserId,
    };
    return formatted;
  }

  async getBookingByIdForAdmin(bookingId: string) {
    const booking = await this.bookingRepository.findByIdForAdmin(bookingId);

    if (!booking) {
      throw new NotFoundDomainException(
        'Booking not found',
        'BOOKING_NOT_FOUND',
        BookingI18nKeys.bookingNotFound,
      );
    }

    const { userId: bookingUser, ...rest } = booking;

    return {
      ...rest,
      rooms: booking.rooms.map((r) => ({
        room: r.roomId,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        guests: r.guests,
      })),
      user: bookingUser,
    };
  }

  async update(id: string, dto: UpdateBookingDto) {
    const booking = await this.bookingRepository.findById(id);
    if (!booking)
      throw new NotFoundDomainException(
        'Booking not found',
        'BOOKING_NOT_FOUND',
        BookingI18nKeys.bookingNotFound,
      );

    if (booking.paymentStatus === BookingPaymentStatus.PAID) {
      throw new DomainException(
        'Paid booking cannot be updated',
        400,
        'PAID_CANNOT_UPDATE',
        BookingI18nKeys.paidCannotUpdate,
      );
    }

    if (booking.bookingType === BookingType.ROOM && dto.rooms) {
      booking.rooms = dto.rooms.map((r) => ({
        roomId: new Types.ObjectId(r.roomId),
        checkIn: new Date(r.checkIn),
        checkOut: new Date(r.checkOut),
        guests: {
          adults: r.adults,
          children: r.children ?? 0,
        },
      }));
    }

    if (booking.bookingType === BookingType.TOUR && dto.tourInfo) {
      booking.tourInfo = {
        tourId: new Types.ObjectId(dto.tourInfo.tourId),
        travelDate: new Date(dto.tourInfo.travelDate),
        participants: dto.tourInfo.participants,
      };
    }

    const updated = await this.bookingRepository.save(booking);
    return withI18nSuccess(
      updated,
      'Booking updated successfully',
      BookingI18nKeys.updated,
    );
  }

  async findOne(id: string) {
    return this.bookingRepository.findById(id);
  }

  async cancel(
    id: string,
    userId: string,
    role?: string,
    roles?: string[],
    session?: ClientSession,
  ) {
    const booking = await this.bookingRepository.findById(id);
    if (!booking)
      throw new NotFoundDomainException(
        'Booking not found',
        'BOOKING_NOT_FOUND',
        BookingI18nKeys.bookingNotFound,
      );

    const isOwner = booking.userId && String(booking.userId) === userId;
    const isAdmin =
      role === 'admin' || (Array.isArray(roles) && roles.includes('admin'));
    if (!isOwner && !isAdmin) {
      throw new ForbiddenDomainException(
        'Only the booking owner or admin can cancel this booking',
        'BOOKING_CANCEL_FORBIDDEN',
        BookingI18nKeys.cancelForbidden,
      );
    }

    if (booking.paymentStatus === BookingPaymentStatus.PAID) {
      throw new DomainException(
        'Paid booking must be refunded before cancel',
        400,
        'PAID_MUST_REFUND',
        BookingI18nKeys.paidMustRefundBeforeCancel,
      );
    }

    const now = new Date();
    const groups = new Map<
      string,
      {
        roomId: Types.ObjectId;
        checkIn: Date;
        checkOut: Date;
        quantity: number;
      }
    >();

    for (const r of booking.rooms) {
      const key = `${r.roomId.toString()}|${r.checkIn.toISOString()}|${r.checkOut.toISOString()}`;
      const existing = groups.get(key);
      if (existing) {
        existing.quantity += 1;
      } else {
        groups.set(key, {
          roomId: r.roomId,
          checkIn: r.checkIn,
          checkOut: r.checkOut,
          quantity: 1,
        });
      }
    }

    const run = async (txSession: ClientSession | undefined) => {
      for (const g of groups.values()) {
        if (new Date(g.checkIn) > now) {
          await this.roomInventoryService.rollbackInventoryRange(
            g.roomId,
            g.checkIn,
            g.checkOut,
            g.quantity,
            txSession,
          );
        }
      }

      booking.status = BookingStatus.CANCELLED;
      return this.bookingRepository.save(booking, txSession);
    };

    const saved = session
      ? await run(session)
      : await this.transactionService.runInTransaction((txSession) =>
          run(txSession),
        );
    return withI18nSuccess(
      saved,
      'Booking cancelled successfully',
      BookingI18nKeys.cancelled,
    );
  }

  async markAsPaid(id: string, session?: ClientSession) {
    const booking = await this.findOne(id);

    if (!booking)
      throw new NotFoundDomainException(
        'Booking not found',
        'BOOKING_NOT_FOUND',
        BookingI18nKeys.bookingNotFound,
      );

    booking.paymentStatus = BookingPaymentStatus.PAID;
    booking.status = BookingStatus.CONFIRMED;

    return this.bookingRepository.save(booking, session);
  }

  async markAsFailed(bookingId: string, session?: ClientSession) {
    const booking = await this.bookingRepository.findByIdAsDocument(bookingId);
    if (!booking)
      throw new NotFoundDomainException(
        'Booking not found',
        'BOOKING_NOT_FOUND',
        BookingI18nKeys.bookingNotFound,
      );

    if (booking.status !== BookingStatus.PENDING) return;

    booking.status = BookingStatus.CANCELLED;
    booking.paymentStatus = BookingPaymentStatus.FAILED;

    await this.bookingRepository.save(booking, session);
  }

  async markAsRefunded(
    bookingId: string,
    fullyRefunded: boolean,
    session?: ClientSession,
  ) {
    const booking = await this.bookingRepository.findByIdAsDocument(bookingId);
    if (!booking)
      throw new NotFoundDomainException(
        'Booking not found',
        'BOOKING_NOT_FOUND',
        BookingI18nKeys.bookingNotFound,
      );

    booking.paymentStatus = BookingPaymentStatus.REFUNDED;

    const run = async (txSession: ClientSession | undefined) => {
      if (!fullyRefunded) {
        await this.bookingRepository.save(booking, txSession);
        return;
      }

      const now = todayInVietnam();
      const groups = new Map<
        string,
        {
          roomId: Types.ObjectId;
          checkIn: Date;
          checkOut: Date;
          quantity: number;
        }
      >();

      for (const r of booking.rooms) {
        const key = `${r.roomId.toString()}|${r.checkIn.toISOString()}|${r.checkOut.toISOString()}`;
        const existing = groups.get(key);
        if (existing) {
          existing.quantity += 1;
        } else {
          groups.set(key, {
            roomId: r.roomId,
            checkIn: r.checkIn,
            checkOut: r.checkOut,
            quantity: 1,
          });
        }
      }

      for (const g of groups.values()) {
        if (g.checkIn.toISOString().substring(0, 10) > now) {
          await this.roomInventoryService.rollbackInventoryRange(
            g.roomId,
            g.checkIn,
            g.checkOut,
            g.quantity,
            txSession,
          );
        }
      }

      booking.status = BookingStatus.CANCELLED;
      await this.bookingRepository.save(booking, txSession);
    };

    if (session) {
      await run(session);
      return;
    }
    await this.transactionService.runInTransaction((txSession) =>
      run(txSession),
    );
  }

  async uploadReceipt(bookingId: string, file: Express.Multer.File) {
    if (!file) {
      throw new DomainException(
        'Receipt image is required',
        400,
        'RECEIPT_REQUIRED',
        BookingI18nKeys.receiptRequired,
      );
    }

    const booking = await this.bookingRepository.uploadReceiptFind(bookingId);
    if (!booking) {
      throw new NotFoundDomainException(
        'Booking not found',
        'BOOKING_NOT_FOUND',
        BookingI18nKeys.bookingNotFound,
      );
    }

    if (booking.paymentStatus !== BookingPaymentStatus.UNPAID) {
      throw new DomainException(
        'Booking already paid or expired',
        400,
        'BOOKING_NOT_UNPAID',
        BookingI18nKeys.alreadyPaidOrExpired,
      );
    }

    const result = await this.cloudinaryService.uploadFile(file, {
      folder: `bookings/${bookingId}/receipts`,
    });

    booking.bankReceipt = {
      url: result.secure_url,
      uploadedAt: new Date(),
      verified: false,
    };

    await this.bookingRepository.save(booking);

    return withI18nSuccess(
      {
        message: 'Receipt uploaded successfully',
        receipt: booking.bankReceipt,
      },
      'Receipt uploaded successfully',
      BookingI18nKeys.receiptUploaded,
    );
  }

  async verifyReceipt(id: string) {
    const booking = await this.bookingRepository.verifyReceiptFind(id);
    if (!booking?.bankReceipt) {
      throw new DomainException(
        'No receipt',
        400,
        'NO_RECEIPT',
        BookingI18nKeys.noReceipt,
      );
    }

    booking.bankReceipt.verified = true;
    booking.paymentStatus = BookingPaymentStatus.PAID;
    booking.status = BookingStatus.CONFIRMED;

    await this.bookingRepository.save(booking);
    return withI18nSuccess(
      { verified: true },
      'Receipt verified successfully',
      BookingI18nKeys.receiptVerified,
    );
  }
}
