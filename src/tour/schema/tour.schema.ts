import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Province } from 'src/provinces/schema/province.schema';

export type TourDocument = Tour & Document;

/* =======================
   SUB SCHEMAS
======================= */

// Lịch trình từng ngày
@Schema({ _id: false })
export class TourItineraryDay {
  @Prop({ required: true })
  dayNumber: number;

  @Prop({ type: Object })
  translations: {
    [langCode: string]: {
      title: string;
      description: string;
      meals?: string[];
      accommodation?: string;
    };
  };
}

export const TourItineraryDaySchema =
  SchemaFactory.createForClass(TourItineraryDay);

// Địa điểm tour đi qua
@Schema({ _id: false })
export class TourDestination {
  @Prop({ type: Types.ObjectId, ref: Province.name, required: true })
  provinceId: Types.ObjectId;

  @Prop({ default: false })
  isMainDestination: boolean;
}

export const TourDestinationSchema =
  SchemaFactory.createForClass(TourDestination);

// Thông tin liên hệ
@Schema({ _id: false })
export class TourContact {
  @Prop()
  phone?: string;

  @Prop()
  email?: string;

  @Prop()
  hotline?: string;
}

export const TourContactSchema = SchemaFactory.createForClass(TourContact);

// Giá tour
@Schema({ _id: false })
export class TourPricing {
  @Prop({ required: true })
  basePrice: number;

  @Prop({ default: 'VND' })
  currency: string;

  @Prop()
  childPrice?: number;

  @Prop()
  infantPrice?: number;

  @Prop()
  singleSupplement?: number;
}

export const TourPricingSchema = SchemaFactory.createForClass(TourPricing);

/* =======================
   TOUR SCHEMA
======================= */

@Schema({
  collection: 'tours',
  timestamps: true,
})
export class Tour {
  /* ================= CORE ================= */

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: true, enum: ['DOMESTIC', 'INTERNATIONAL', 'DAILY'] })
  tourType: string;

  /* ================= DURATION ================= */

  @Prop({
    type: {
      days: { type: Number, required: true },
      nights: { type: Number, required: true },
    },
    required: true,
  })
  duration: {
    days: number;
    nights: number;
  };

  /* ================= DESTINATIONS ================= */

  @Prop({
    type: [TourDestinationSchema],
    required: true,
  })
  destinations: TourDestination[];

  @Prop({
    type: Types.ObjectId,
    ref: Province.name,
    required: true,
    index: true,
  })
  departureProvinceId: Types.ObjectId;

  /* ================= TRANSLATIONS ================= */

  @Prop({
    type: Object,
    required: true,
    default: {},
  })
  translations: {
    [langCode: string]: {
      name: string;
      description?: string;
      shortDescription?: string;
      highlights?: string[];
      inclusions?: string[];
      exclusions?: string[];
      notes?: string[];
      cancellationPolicy?: string;
      seo?: {
        title?: string;
        description?: string;
        keywords?: string[];
      };
    };
  };

  /* ================= ITINERARY ================= */

  @Prop({
    type: [TourItineraryDaySchema],
    default: [],
  })
  itinerary: TourItineraryDay[];

  /* ================= CAPACITY ================= */

  @Prop({
    type: {
      minGuests: { type: Number, default: 1 },
      maxGuests: { type: Number, required: true },
      privateAvailable: { type: Boolean, default: false },
    },
    required: true,
  })
  capacity: {
    minGuests: number;
    maxGuests: number;
    privateAvailable: boolean;
  };

  /* ================= PRICING ================= */

  @Prop({ type: TourPricingSchema, required: true })
  pricing: TourPricing;

  /* ================= CONTACT ================= */

  @Prop({ type: TourContactSchema })
  contact?: TourContact;

  /* ================= MEDIA ================= */

  @Prop({
    type: {
      url: String,
      publicId: String,
      alt: String,
    },
  })
  thumbnail?: {
    url: string;
    publicId?: string;
    alt?: string;
  };

  @Prop({
    type: [
      {
        url: String,
        publicId: String,
        alt: String,
        order: Number,
      },
    ],
    default: [],
  })
  gallery: Array<{
    url: string;
    publicId?: string;
    alt?: string;
    order?: number;
  }>;

  /* ================= AMENITIES / TRANSPORT ================= */

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'Amenity' }],
    default: [],
  })
  amenities: Types.ObjectId[];

  @Prop({
    type: [String],
    default: [],
  })
  transportTypes: string[];

  /* ================= BOOKING CONFIG ================= */

  @Prop({
    type: {
      advanceBookingDays: { type: Number, default: 1 },
      allowInstantBooking: { type: Boolean, default: true },
      requireDeposit: { type: Boolean, default: true },
      depositPercent: { type: Number, default: 30 },
    },
    default: {},
  })
  bookingConfig: {
    advanceBookingDays: number;
    allowInstantBooking: boolean;
    requireDeposit: boolean;
    depositPercent: number;
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

  /* ================= SCHEDULE (Ngày khởi hành) ================= */

  @Prop({
    type: {
      departureDays: [String],
      fixedDepartures: [
        {
          date: Date,
          availableSlots: Number,
          status: String,
        },
      ],
    },
    default: {},
  })
  schedule: {
    departureDays?: string[];
    fixedDepartures?: Array<{
      date: Date;
      availableSlots: number;
      status: string;
    }>;
  };

  /* ================= DIFFICULTY ================= */

  @Prop({
    type: String,
    enum: ['EASY', 'MODERATE', 'CHALLENGING', 'DIFFICULT'],
    default: 'MODERATE',
  })
  difficulty: string;
}

export const TourSchema = SchemaFactory.createForClass(Tour);

/* ================= INDEXES ================= */

TourSchema.index({ slug: 1 }, { unique: true });
TourSchema.index({ code: 1 }, { unique: true });
TourSchema.index({ isActive: 1 });
TourSchema.index({ tourType: 1 });
TourSchema.index({ 'destinations.provinceId': 1 });
TourSchema.index({ departureProvinceId: 1 });
TourSchema.index({ 'pricing.basePrice': 1 });
TourSchema.index({ 'duration.days': 1 });
TourSchema.index({ isActive: 1, tourType: 1 });
TourSchema.index({ 'destinations.provinceId': 1, isActive: 1 });
TourSchema.index({ 'ratingSummary.average': -1 });
TourSchema.index({ createdAt: -1 });
