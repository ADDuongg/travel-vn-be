import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Province } from 'src/provinces/schema/province.schema';

export type HotelDocument = Hotel & Document;

/* =======================
   SUB SCHEMA
======================= */

@Schema({ _id: false })
export class HotelContact {
  @Prop()
  phone?: string;

  @Prop()
  email?: string;

  @Prop()
  website?: string;
}

export const HotelContactSchema = SchemaFactory.createForClass(HotelContact);

@Schema({ _id: false })
export class HotelLocation {
  @Prop()
  lat?: number;

  @Prop()
  lng?: number;
}

export const HotelLocationSchema = SchemaFactory.createForClass(HotelLocation);

/* =======================
   HOTEL SCHEMA
======================= */

@Schema({
  collection: 'hotels',
  timestamps: true,
})
export class Hotel {
  /* ================= CORE ================= */

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 3, min: 1, max: 5 })
  starRating: number;

  /* ================= PROVINCE ================= */

  @Prop({
    type: Types.ObjectId,
    ref: Province.name,
    required: true,
    index: true,
  })
  provinceId: Types.ObjectId;

  /* ================= TRANSLATIONS ================= */
  /** Keys: langCode (vi, en, ...). Values: translated fields */
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
      address?: string;
      policies?: string[];
      seo?: {
        title?: string;
        description?: string;
      };
    };
  };

  /* ================= CONTACT ================= */

  @Prop({ type: HotelContactSchema })
  contact?: HotelContact;

  /* ================= LOCATION ================= */

  @Prop({ type: HotelLocationSchema })
  location?: HotelLocation;

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

  /* ================= AMENITIES (hotel-level) ================= */

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'Amenity' }],
    default: [],
  })
  amenities: Types.ObjectId[];
}

export const HotelSchema = SchemaFactory.createForClass(Hotel);

/* ================= INDEX ================= */

HotelSchema.index({ slug: 1 }, { unique: true });
HotelSchema.index({ provinceId: 1 });
HotelSchema.index({ isActive: 1 });
HotelSchema.index({ provinceId: 1, isActive: 1 });
HotelSchema.index({ starRating: 1 });
