import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Booking,
  BookingDocument,
  BookingPaymentStatus,
  BookingStatus,
  BookingType,
} from './schema/booking.schema';

@Injectable()
export class BookingRepository {
  constructor(
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<BookingDocument>,
  ) {}

  createRoomBookingDoc(data: Partial<Booking>): BookingDocument {
    return new this.bookingModel(data);
  }

  async save(booking: BookingDocument): Promise<BookingDocument> {
    return booking.save();
  }

  async findManyAdminList(params: {
    filter: Record<string, unknown>;
    mongoSort: Record<string, 1 | -1>;
    skip: number;
    pageSize: number;
  }) {
    const { filter, mongoSort, skip, pageSize } = params;
    return Promise.all([
      this.bookingModel
        .find(filter)
        .populate({
          path: 'rooms.roomId',
          select: 'name slug roomType thumbnail capacity pricing sale category',
        })
        .populate({
          path: 'userId',
          select: 'email name',
        })
        .sort(mongoSort)
        .skip(skip)
        .limit(pageSize)
        .lean(),
      this.bookingModel.countDocuments(filter),
    ]);
  }

  async findManyByUser(params: {
    filter: Record<string, unknown>;
    mongoSort: Record<string, 1 | -1>;
    skip: number;
    pageSize: number;
  }) {
    const { filter, mongoSort, skip, pageSize } = params;
    return Promise.all([
      this.bookingModel
        .find(filter)
        .populate({
          path: 'rooms.roomId',
          select: 'name slug roomType thumbnail capacity pricing sale category',
        })
        .sort(mongoSort)
        .skip(skip)
        .limit(pageSize)
        .lean(),
      this.bookingModel.countDocuments(filter),
    ]);
  }

  async findOneByUserAndBookingId(userId: string, bookingId: string) {
    return this.bookingModel
      .findOne({
        _id: new Types.ObjectId(bookingId),
        userId: new Types.ObjectId(userId),
      })
      .populate({
        path: 'rooms.roomId',
        select: 'name slug roomType thumbnail capacity pricing sale category',
      })
      .populate({
        path: 'userId',
      })
      .lean();
  }

  async findByIdForAdmin(bookingId: string) {
    return this.bookingModel
      .findById(new Types.ObjectId(bookingId))
      .populate({
        path: 'rooms.roomId',
        select: 'name slug roomType thumbnail capacity pricing sale category',
      })
      .populate({
        path: 'userId',
        select: 'email name',
      })
      .lean();
  }

  async findById(id: string): Promise<BookingDocument | null> {
    return this.bookingModel.findById(id);
  }

  async findByIdAsDocument(bookingId: string): Promise<BookingDocument | null> {
    return this.bookingModel.findById(bookingId);
  }

  async uploadReceiptFind(bookingId: string): Promise<BookingDocument | null> {
    return this.bookingModel.findById(bookingId);
  }

  async verifyReceiptFind(id: string): Promise<BookingDocument | null> {
    return this.bookingModel.findById(id);
  }

  async findPendingRoomBookingsToExpire(expiredAt: Date) {
    return this.bookingModel.find({
      bookingType: BookingType.ROOM,
      status: BookingStatus.PENDING,
      paymentStatus: BookingPaymentStatus.UNPAID,
      createdAt: { $lt: expiredAt },
    });
  }
}
