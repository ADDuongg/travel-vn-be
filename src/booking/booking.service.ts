import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ForbiddenDomainException,
  NotFoundDomainException,
} from 'src/common/exceptions';
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

  /* ===== Helpers: pricing ===== */
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

  /* ================= ROOM BOOKING ================= */

  async createRoomBooking(
    dto: CreateRoomBookingDto,
    userId: string,
  ): Promise<Booking> {
    const room = await this.roomService.findOne(dto.roomId);
    if (!room) throw new NotFoundDomainException('Room not found');

    const checkIn = parseDateOnly(dto.checkIn);
    const checkOut = parseDateOnly(dto.checkOut);

    const nights = Math.floor(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (nights <= 0) {
      throw new BadRequestException('Invalid check-in / check-out');
    }

    const minNights = room.bookingConfig?.minNights ?? 1;
    const maxNights = room.bookingConfig?.maxNights;

    if (nights < minNights) {
      throw new BadRequestException(`Minimum stay is ${minNights} nights`);
    }

    if (maxNights && nights > maxNights) {
      throw new BadRequestException(`Maximum stay is ${maxNights} nights`);
    }

    const quantity = dto.rooms.length;

    const totalRooms = room.inventory?.totalRooms;
    if (typeof totalRooms !== 'number') {
      throw new BadRequestException('Room inventory is not configured');
    }

    const isAvailable = await this.roomInventoryService.checkAvailability(
      room._id as Types.ObjectId,
      checkIn,
      checkOut,
    );

    if (!isAvailable) {
      throw new BadRequestException('Room not available');
    }

    if (quantity > totalRooms) {
      throw new BadRequestException(`Only ${totalRooms} rooms available`);
    }

    for (const r of dto.rooms) {
      const totalGuests = r.adults + (r.children ?? 0);
      const maxCapacity =
        (room.capacity?.maxAdults ?? 0) + (room.capacity?.maxChildren ?? 0);

      if (totalGuests > maxCapacity) {
        throw new BadRequestException('Exceed max guests per room');
      }

      if (room.capacity?.maxAdults && r.adults > room.capacity.maxAdults) {
        throw new BadRequestException(
          `Exceed max adults per room (${room.capacity.maxAdults})`,
        );
      }

      if (
        room.capacity?.maxChildren &&
        (r.children ?? 0) > room.capacity.maxChildren
      ) {
        throw new BadRequestException(
          `Exceed max children per room (${room.capacity.maxChildren})`,
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
    return this.transactionService.runInTransaction(async (session) => {
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
    });
  }

  /* ================= ADMIN LIST ================= */
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
      throw new NotFoundDomainException('Booking not found');
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

  /* ================= ADMIN DETAIL ================= */
  async getBookingByIdForAdmin(bookingId: string) {
    const booking = await this.bookingRepository.findByIdForAdmin(bookingId);

    if (!booking) {
      throw new NotFoundDomainException('Booking not found');
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

  /* ================= UPDATE ================= */

  async update(id: string, dto: UpdateBookingDto): Promise<Booking> {
    const booking = await this.bookingRepository.findById(id);
    if (!booking) throw new NotFoundDomainException('Booking not found');

    if (booking.paymentStatus === BookingPaymentStatus.PAID) {
      throw new BadRequestException('Paid booking cannot be updated');
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

    return this.bookingRepository.save(booking);
  }

  async findOne(id: string) {
    return this.bookingRepository.findById(id);
  }

  /* ================= CANCEL ================= */

  async cancel(
    id: string,
    userId: string,
    role?: string,
    roles?: string[],
    session?: ClientSession,
  ) {
    const booking = await this.bookingRepository.findById(id);
    if (!booking) throw new NotFoundDomainException('Booking not found');

    const isOwner = booking.userId && String(booking.userId) === userId;
    const isAdmin =
      role === 'admin' || (Array.isArray(roles) && roles.includes('admin'));
    if (!isOwner && !isAdmin) {
      throw new ForbiddenDomainException(
        'Only the booking owner or admin can cancel this booking',
      );
    }

    if (booking.paymentStatus === BookingPaymentStatus.PAID) {
      throw new BadRequestException(
        'Paid booking must be refunded before cancel',
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

    return session
      ? run(session)
      : this.transactionService.runInTransaction((txSession) => run(txSession));
  }

  async markAsPaid(id: string, session?: ClientSession) {
    const booking = await this.findOne(id);

    if (!booking) throw new NotFoundDomainException('Booking not found');

    booking.paymentStatus = BookingPaymentStatus.PAID;
    booking.status = BookingStatus.CONFIRMED;

    return this.bookingRepository.save(booking, session);
  }

  async markAsFailed(bookingId: string, session?: ClientSession) {
    const booking = await this.bookingRepository.findByIdAsDocument(bookingId);
    if (!booking) throw new NotFoundDomainException('Booking not found');

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
    if (!booking) throw new NotFoundDomainException('Booking not found');

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
      throw new BadRequestException('Receipt image is required');
    }

    const booking = await this.bookingRepository.uploadReceiptFind(bookingId);
    if (!booking) {
      throw new NotFoundDomainException('Booking not found');
    }

    if (booking.paymentStatus !== BookingPaymentStatus.UNPAID) {
      throw new BadRequestException('Booking already paid or expired');
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

    return {
      message: 'Receipt uploaded successfully',
      receipt: booking.bankReceipt,
    };
  }

  async verifyReceipt(id: string) {
    const booking = await this.bookingRepository.verifyReceiptFind(id);
    if (!booking?.bankReceipt) {
      throw new BadRequestException('No receipt');
    }

    booking.bankReceipt.verified = true;
    booking.paymentStatus = BookingPaymentStatus.PAID;
    booking.status = BookingStatus.CONFIRMED;

    await this.bookingRepository.save(booking);
  }
}
