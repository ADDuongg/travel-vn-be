import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TourGuideDocument = TourGuide & Document;

@Schema({ collection: 'tour_guides', timestamps: true })
export class TourGuide {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  userId: Types.ObjectId;

  @Prop({ type: Object, default: {} })
  translations: {
    [langCode: string]: {
      bio?: string;
      shortBio?: string;
      specialties?: string;
      specialtyItems?: string[];
    };
  };

  @Prop({ type: [String], default: [] })
  languages: string[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Province' }], default: [] })
  specializedProvinces: Types.ObjectId[];

  @Prop({ type: [String], default: [] })
  certifications: string[];

  @Prop()
  licenseNumber?: string;

  @Prop()
  yearsOfExperience?: number;

  @Prop({
    type: [{ url: String, publicId: String, alt: String, order: Number }],
    default: [],
  })
  gallery: Array<{
    url: string;
    publicId?: string;
    alt?: string;
    order?: number;
  }>;

  @Prop({
    type: { url: String, publicId: String, filename: String, format: String },
  })
  cv?: {
    url: string;
    publicId?: string;
    filename?: string;
    format?: string;
  };

  @Prop({
    type: { average: Number, total: Number },
    default: { average: 0, total: 0 },
  })
  ratingSummary: { average: number; total: number };

  @Prop({ default: 0 })
  responseRate?: number;

  @Prop({ default: 0 })
  completedTripsCount?: number;

  @Prop({ default: 0 })
  returningCustomerRate?: number;

  @Prop({ default: true })
  isAvailable: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop()
  verifiedAt?: Date;

  @Prop()
  dailyRate?: number;

  @Prop({ default: 'VND' })
  currency: string;

  @Prop({ type: [String], default: [] })
  contactMethods: string[];
}

export const TourGuideSchema = SchemaFactory.createForClass(TourGuide);

TourGuideSchema.index({ isActive: 1 });
TourGuideSchema.index({ isVerified: 1 });
TourGuideSchema.index({ isAvailable: 1 });
TourGuideSchema.index({ specializedProvinces: 1 });
TourGuideSchema.index({ languages: 1 });
TourGuideSchema.index({ 'ratingSummary.average': -1 });
TourGuideSchema.index({ isActive: 1, isVerified: 1, isAvailable: 1 });
