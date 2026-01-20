import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { RoomInventoryService } from 'src/room-inventory/room-inventory.service';
import { parseDateOnly } from 'src/utils/date.util';
import { RoomService } from '../room/room.service';
import { BookingQueryDto } from './dto/booking-query.dto';
import { CreateRoomBookingDto } from './dto/create-room-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import {
  Booking,
  BookingDocument,
  BookingPaymentStatus,
  BookingStatus,
  BookingType,
} from './schema/booking.schema';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class BookingService {
  constructor(
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<BookingDocument>,
    private readonly roomService: RoomService,
    private readonly roomInventoryService: RoomInventoryService,
    private readonly cloudinaryService: CloudinaryService,
    // private readonly tourService: TourService,
  ) {}

  /* ================= TOUR BOOKING ================= */

  /* async createTourBooking(dto: CreateTourBookingDto): Promise<Booking> {
    const tour = await this.tourService.findById(dto.tourId);
    if (!tour) throw new NotFoundException('Tour not found');

    if (dto.participants > tour.maxParticipants) {
      throw new BadRequestException('Exceed tour capacity');
    }

    const amount = dto.participants * tour.price;

    const booking = new this.bookingModel({
      bookingType: BookingType.TOUR,
      status: BookingStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,

      amount,
      currency: tour.currency,

      tourInfo: {
        tourId: tour._id,
        travelDate: new Date(dto.travelDate),
        participants: dto.participants,
      },

      userId: dto.userId ? new Types.ObjectId(dto.userId) : undefined,
    });

    return booking.save();
  } */

  /* ================= ROOM BOOKING ================= */

  async createRoomBooking(dto: CreateRoomBookingDto): Promise<Booking> {
    const room = await this.roomService.findOne(dto.roomId);
    if (!room) throw new NotFoundException('Room not found');

    const checkIn = parseDateOnly(dto.checkIn);
    const checkOut = parseDateOnly(dto.checkOut);

    /* ===== nights ===== */
    const nights = Math.floor(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (nights <= 0) {
      throw new BadRequestException('Invalid check-in / check-out');
    }

    if (nights < room.bookingConfig.minNights) {
      throw new BadRequestException(
        `Minimum stay is ${room.bookingConfig.minNights} nights`,
      );
    }

    if (room.bookingConfig.maxNights && nights > room.bookingConfig.maxNights) {
      throw new BadRequestException(
        `Maximum stay is ${room.bookingConfig.maxNights} nights`,
      );
    }
    /* ===== quantity ===== */
    const quantity = dto.rooms.length;
    /* ======================================================
     🔥 INVENTORY FLOW (QUAN TRỌNG NHẤT)
     ====================================================== */

    // 1️⃣ ENSURE INVENTORY EXISTS
    await this.roomInventoryService.ensureInventoryExists(
      room._id as Types.ObjectId,
      checkIn,
      checkOut,
    );

    // 2️⃣ CHECK AVAILABILITY (theo ngày)
    const isAvailable = await this.roomInventoryService.checkAvailability(
      room._id as Types.ObjectId,
      checkIn,
      checkOut,
    );

    if (!isAvailable) {
      throw new BadRequestException('Room not available');
    }

    await this.roomInventoryService.reserveInventoryRange(
      room._id as Types.ObjectId,
      checkIn,
      checkOut,
      quantity,
    );

    if (quantity > room.inventory.totalRooms) {
      throw new BadRequestException(
        `Only ${room.inventory.totalRooms} rooms available`,
      );
    }

    /* ===== CAPACITY PER ROOM ===== */
    for (const r of dto.rooms) {
      const totalGuests = r.adults + (r.children ?? 0);
      const maxCapacity =
        (room.capacity?.maxAdults ?? 0) + (room.capacity?.maxChildren ?? 0);

      if (totalGuests > maxCapacity) {
        throw new BadRequestException('Exceed max guests per room');
      }
    }

    /* ===== amount ===== */
    const amount = nights * room.pricing.basePrice * quantity;

    /* ===== build booked rooms ===== */
    const bookedRooms = dto.rooms.map((r) => ({
      roomId: room._id,
      checkIn,
      checkOut,
      guests: {
        adults: r.adults,
        children: r.children ?? 0,
      },
    }));

    const booking = new this.bookingModel({
      bookingType: BookingType.ROOM,
      status: BookingStatus.PENDING,
      paymentStatus: BookingPaymentStatus.UNPAID,

      amount,
      currency: room.pricing.currency,

      rooms: bookedRooms,

      userId: dto.userId ? new Types.ObjectId(dto.userId) : undefined,
    });

    return booking.save();
  }

  /* async getBookingsByUser({
    userId,
    page,
    limit,
    status,
  }: {
    userId: string;
    page: number;
    limit: number;
    status?: BookingStatus;
  }) {
    const filter: any = { user: userId };

    if (status && status !== BookingStatus.All) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.bookingModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('room') // hoặc tour
        .lean(),
      this.bookingModel.countDocuments(filter),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        pageCount: Math.ceil(total / limit),
      },
    };
  } */

  async getBookingsByUser(userId: string, query: BookingQueryDto) {
    const { pageIndex, pageSize, status, paymentStatus, q, sort } = query;

    const filter: any = {
      userId: new Types.ObjectId(userId),
    };
    console.log('userId', userId);
    console.log('query', query);

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

    let mongoSort: any = { createdAt: -1 };

    if (sort?.length) {
      mongoSort = {};
      for (const s of sort) {
        if (['createdAt', 'amount', 'status', 'paymentStatus'].includes(s.by)) {
          mongoSort[s.by] = s.dir === 'asc' ? 1 : -1;
        }
      }
    }

    const skip = pageIndex * pageSize;

    const [items, total] = await Promise.all([
      this.bookingModel
        .find(filter)
        .populate({
          path: 'rooms.roomId',
          select: 'name slug thumbnail capacity',
        })
        .sort(mongoSort)
        .skip(skip)
        .limit(pageSize)
        .lean(),
      this.bookingModel.countDocuments(filter),
    ]);
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
    console.log('userId', userId);
    console.log('bookingId', bookingId);

    const booking = await this.bookingModel
      .findOne({
        _id: new Types.ObjectId(bookingId),
        userId: new Types.ObjectId(userId),
      })
      .populate({
        path: 'rooms.roomId',
        select: 'name slug thumbnail capacity',
      })
      .populate({
        path: 'userId',
      })
      .lean();

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    const { userId: _, ...rest } = booking;
    const formatted = {
      ...rest,
      rooms: booking.rooms.map((r) => ({
        room: r.roomId,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        guests: r.guests,
      })),
      user: booking.userId,
    };
    return formatted;
  }

  /* ================= UPDATE ================= */

  async update(id: string, dto: UpdateBookingDto): Promise<Booking> {
    const booking = await this.bookingModel.findById(id);
    if (!booking) throw new NotFoundException('Booking not found');

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

    return booking.save();
  }

  async findOne(id: string) {
    return this.bookingModel.findById(id);
  }

  /* ================= CANCEL ================= */

  async cancel(id: string) {
    const booking = await this.bookingModel.findById(id);
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.paymentStatus === BookingPaymentStatus.PAID) {
      throw new BadRequestException(
        'Paid booking must be refunded before cancel',
      );
    }

    booking.status = BookingStatus.CANCELLED;
    return booking.save();
  }

  async markAsPaid(id: string) {
    const booking = await this.findOne(id);

    if (!booking) throw new NotFoundException('Booking not found');

    booking.paymentStatus = BookingPaymentStatus.PAID;
    booking.status = BookingStatus.CONFIRMED;

    return booking.save();
  }

  async markAsFailed(bookingId: string) {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status !== BookingStatus.PENDING) return;

    /* const { roomId, checkIn, checkOut } = booking.rooms[0];

    const quantity = booking.rooms.length;

    await this.roomInventoryService.rollbackInventoryRange(
      roomId,
      checkIn,
      checkOut,
      quantity,
    ); */

    booking.status = BookingStatus.CANCELLED;
    booking.paymentStatus = BookingPaymentStatus.FAILED;

    await booking.save();
  }

  async markAsRefunded(bookingId: string, fullyRefunded: boolean) {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) throw new NotFoundException('Booking not found');

    booking.paymentStatus = BookingPaymentStatus.REFUNDED;
    const quantity = booking.rooms.length;
    if (fullyRefunded) {
      const { roomId, checkIn, checkOut } = booking.rooms[0];

      await this.roomInventoryService.rollbackInventoryRange(
        roomId,
        checkIn,
        checkOut,
        quantity,
      );

      booking.status = BookingStatus.CANCELLED;
    }

    await booking.save();
  }

  async uploadReceipt(bookingId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Receipt image is required');
    }

    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.paymentStatus !== BookingPaymentStatus.UNPAID) {
      throw new BadRequestException('Booking already paid or expired');
    }

    // ⬆️ upload lên Cloudinary
    const result = await this.cloudinaryService.uploadFile(file, {
      folder: `bookings/${bookingId}/receipts`,
    });

    booking.bankReceipt = {
      url: result.secure_url,
      uploadedAt: new Date(),
      verified: false,
    };

    await booking.save();

    return {
      message: 'Receipt uploaded successfully',
      receipt: booking.bankReceipt,
    };
  }

  async verifyReceipt(id: string) {
    const booking = await this.bookingModel.findById(id);
    if (!booking?.bankReceipt) {
      throw new BadRequestException('No receipt');
    }

    booking.bankReceipt.verified = true;
    booking.paymentStatus = BookingPaymentStatus.PAID;
    booking.status = BookingStatus.CONFIRMED;

    await booking.save();
  }
}
