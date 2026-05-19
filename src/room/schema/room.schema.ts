import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Hotel } from 'src/hotel/schema/hotel.schema';

export type RoomDocument = Room & Document;

@Schema({ timestamps: true, collection: 'rooms' })
export class Room {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true })
  roomType: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({
    type: {
      baseAdults: { type: Number, required: true },
      baseChildren: { type: Number, default: 0 },
      maxAdults: { type: Number, required: true },
      maxChildren: { type: Number, default: 0 },
      roomSize: { type: Number },
    },
    required: true,
  })
  capacity: {
    baseAdults: number;
    baseChildren: number;
    maxAdults: number;
    maxChildren: number;
    roomSize?: number;
  };

  @Prop({
    type: Types.ObjectId,
    ref: Hotel.name,
    required: true,
  })
  hotelId: Types.ObjectId;

  @Prop({
    type: {
      basePrice: { type: Number, required: true },
      currency: { type: String, default: 'VND' },
      weekendPrice: Number,
      extraAdultPrice: Number,
      extraChildPrice: Number,
    },
    required: true,
  })
  pricing: {
    basePrice: number;
    currency: string;
    weekendPrice?: number;
    extraAdultPrice?: number;
    extraChildPrice?: number;
  };

  @Prop({
    type: {
      url: String,
      alt: String,
    },
  })
  thumbnail?: {
    url: string;
    alt?: string;
  };

  @Prop({
    type: [
      {
        url: String,
        alt: String,
        order: Number,
      },
    ],
    default: [],
  })
  gallery: Array<{
    url: string;
    alt?: string;
    order?: number;
  }>;

  @Prop({
    type: Object,
    required: true,
    default: {},
  })
  translations: {
    [langCode: string]: {
      name: string;
      description: string;
      shortDescription?: string;
      hotelRule?: string[];
      faq: {
        question: string;
        answer: string;
      }[];
    };
  };

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'Amenity' }],
    default: [],
  })
  amenities: Types.ObjectId[];

  @Prop({
    type: {
      minNights: { type: Number, default: 1 },
      maxNights: Number,
      allowInstantBooking: { type: Boolean, default: true },
    },
    default: {},
  })
  bookingConfig: {
    minNights: number;
    maxNights?: number;
    allowInstantBooking: boolean;
  };

  @Prop({
    type: {
      totalRooms: { type: Number, required: true },
    },
    required: true,
  })
  inventory: {
    totalRooms: number;
  };

  @Prop({
    type: {
      title: String,
      description: String,
    },
  })
  seo?: {
    title?: string;
    description?: string;
  };

  @Prop({
    type: Object,
    default: {},
  })
  sale?: {
    isActive: boolean;
    type: 'PERCENT' | 'FIXED';
    value: number;
    startDate?: Date;
    endDate?: Date;
  };

  @Prop({
    type: {
      average: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    default: {},
  })
  ratingSummary: {
    average: number;
    total: number;
  };
}

export const RoomSchema = SchemaFactory.createForClass(Room);

RoomSchema.index({ isActive: 1 });
RoomSchema.index({ 'pricing.basePrice': 1 });
RoomSchema.index({ hotelId: 1 });
RoomSchema.index({ hotelId: 1, isActive: 1 });
