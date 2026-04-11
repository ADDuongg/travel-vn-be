import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum BookingType {
  ROOM = 'ROOM',
  TOUR = 'TOUR',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  All = 'ALL',
}

export enum BookingPaymentStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  EXPIRED = 'EXPIRED',
}

@Schema({ _id: false })
export class BookedRoom {
  @Prop({ type: Types.ObjectId, ref: 'Room', required: true })
  roomId: Types.ObjectId;

  @Prop({ required: true })
  checkIn: Date;

  @Prop({ required: true })
  checkOut: Date;

  @Prop({
    type: {
      adults: { type: Number, required: true },
      children: { type: Number, default: 0 },
    },
    required: true,
  })
  guests: {
    adults: number;
    children: number;
  };
}

export const BookedRoomSchema = SchemaFactory.createForClass(BookedRoom);

@Schema({ _id: false })
export class TourInfo {
  @Prop({ type: Types.ObjectId, required: true })
  tourId: Types.ObjectId;

  @Prop({ required: true })
  travelDate: Date;

  @Prop({ required: true })
  participants: number;
}

export const TourInfoSchema = SchemaFactory.createForClass(TourInfo);

export type BookingDocument = Booking & Document;

@Schema({
  collection: 'bookings',
  timestamps: true,
})
export class Booking {
  /* ---- type ---- */
  @Prop({
    type: String,
    enum: BookingType,
    required: true,
  })
  bookingType: BookingType;

  /* ---- status ---- */
  @Prop({
    type: String,
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @Prop({
    type: String,
    enum: BookingPaymentStatus,
    default: BookingPaymentStatus.UNPAID,
  })
  paymentStatus: BookingPaymentStatus;

  /* ---- pricing ---- */
  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  currency: string;

  /* ---- relations ---- */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId?: Types.ObjectId;

  @Prop({
    type: {
      url: String,
      uploadedAt: Date,
      verified: { type: Boolean, default: false },
    },
  })
  bankReceipt?: {
    url: string;
    uploadedAt: Date;
    verified: boolean;
  };

  /* ---- specific info ---- */
  @Prop({
    type: [BookedRoomSchema],
    required: true,
  })
  rooms: BookedRoom[];

  @Prop({ type: TourInfoSchema })
  tourInfo?: TourInfo;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
