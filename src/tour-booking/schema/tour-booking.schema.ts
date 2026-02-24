import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Tour } from 'src/tour/schema/tour.schema';
import { TourInventory } from 'src/tour-inventory/schema/tour-inventory.schema';

export type TourBookingDocument = TourBooking & Document;

export enum TourBookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

@Schema({ _id: false })
export class TourBookingGuest {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true })
  email: string;

  @Prop()
  phone?: string;

  @Prop()
  note?: string;
}

export const TourBookingGuestSchema =
  SchemaFactory.createForClass(TourBookingGuest);

@Schema({
  collection: 'tour_bookings',
  timestamps: true,
})
export class TourBooking {
  @Prop({ required: true, unique: true, index: true })
  bookingCode: string;

  @Prop({ type: Types.ObjectId, ref: Tour.name, required: true, index: true })
  tourId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: TourInventory.name,
    required: true,
    index: true,
  })
  tourInventoryId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId?: Types.ObjectId;

  @Prop({ type: TourBookingGuestSchema, required: true })
  guest: TourBookingGuest;

  @Prop({ required: true, min: 0 })
  adults: number;

  @Prop({ default: 0, min: 0 })
  children: number;

  @Prop({ default: 0, min: 0 })
  infants: number;

  @Prop({ required: true })
  departureDate: Date;

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ default: 'VND' })
  currency: string;

  @Prop({ default: 0 })
  depositAmount: number;

  @Prop({ default: 0 })
  paidAmount: number;

  @Prop({
    type: String,
    enum: TourBookingStatus,
    default: TourBookingStatus.PENDING,
  })
  status: TourBookingStatus;

  @Prop()
  paidAt?: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop()
  cancelReason?: string;

  @Prop({
    type: {
      provider: String,
      transactionId: String,
      amount: Number,
      paidAt: Date,
    },
  })
  payment?: {
    provider?: string;
    transactionId?: string;
    amount?: number;
    paidAt?: Date;
  };
}

export const TourBookingSchema = SchemaFactory.createForClass(TourBooking);

TourBookingSchema.index({ userId: 1, createdAt: -1 });
TourBookingSchema.index({ status: 1 });
