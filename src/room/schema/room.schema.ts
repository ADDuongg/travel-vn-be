import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Hotel } from 'src/hotel/schema/hotel.schema';

export type RoomDocument = Room & Document;

@Schema({ timestamps: true, collection: 'rooms' })
export class Room {
  /* ================= CORE ================= */

  @Prop({ required: true, unique: true })
  code: string; // STD_DELUXE

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true })
  roomType: string; // e.g., Master, Deluxe

  @Prop({ default: true })
  isActive: boolean;

  /* ================= CAPACITY ================= */
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

  /* ================= RELATION ================= */
  @Prop({
    type: Types.ObjectId,
    ref: Hotel.name,
    required: true,
    index: true,
  })
  hotelId: Types.ObjectId;

  /* ================= PRICING ================= */

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

  /* ================= MEDIA ================= */

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

  /* ================= TRANSLATIONS ================= */

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

  /* ================= AMENITIES ================= */

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'Amenity' }],
    default: [],
  })
  amenities: Types.ObjectId[];

  /* ================= BOOKING CONFIG ================= */

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

  /* ================= INVENTORY ================= */

  @Prop({
    type: {
      totalRooms: { type: Number, required: true },
    },
    required: true,
  })
  inventory: {
    totalRooms: number;
  };

  /* ================= SEO ================= */

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

  /* ================= SALE / DISCOUNT ================= */

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

  /* ================= RATING ================= */

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

RoomSchema.index({ code: 1 }, { unique: true });
RoomSchema.index({ slug: 1 }, { unique: true });
RoomSchema.index({ isActive: 1 });
RoomSchema.index({ 'pricing.basePrice': 1 });
RoomSchema.index({ hotelId: 1 });
RoomSchema.index({ hotelId: 1, isActive: 1 });
