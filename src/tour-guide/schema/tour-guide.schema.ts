import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TourGuideDocument = TourGuide & Document;

@Schema({ collection: 'tour_guides', timestamps: true })
export class TourGuide {
  // === Link to User (1-1) ===
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  })
  userId: Types.ObjectId;

  // === Multi-language bio ===
  @Prop({ type: Object })
  translations: {
    [langCode: string]: {
      bio: string;
      shortBio?: string;
      specialties?: string;
    };
  };

  // === Professional Info ===
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

  // === Media ===
  @Prop({
    type: [{ url: String, publicId: String, alt: String }],
    default: [],
  })
  gallery: Array<{ url: string; publicId?: string; alt?: string }>;

  @Prop({
    type: { url: String, publicId: String, filename: String },
  })
  cv?: {
    url: string;
    publicId?: string;
    filename?: string;
  };

  // === Rating (auto-update từ Review) ===
  @Prop({
    type: { average: Number, total: Number },
    default: { average: 0, total: 0 },
  })
  ratingSummary: { average: number; total: number };

  // === Status ===
  @Prop({ default: true })
  isAvailable: boolean;

  @Prop({ default: true })
  isActive: boolean; // Soft delete

  @Prop({ default: false })
  isVerified: boolean; // Admin đã xác minh

  @Prop()
  verifiedAt?: Date;

  // === Pricing ===
  @Prop()
  dailyRate?: number;

  @Prop({ default: 'VND' })
  currency: string;

  // === Contact preference ===
  @Prop({ type: [String], default: [] })
  contactMethods: string[]; // ['phone', 'zalo', 'email']
}

export const TourGuideSchema = SchemaFactory.createForClass(TourGuide);

TourGuideSchema.index({ userId: 1 }, { unique: true });
TourGuideSchema.index({ isActive: 1 });
TourGuideSchema.index({ isVerified: 1 });
TourGuideSchema.index({ isAvailable: 1 });
TourGuideSchema.index({ specializedProvinces: 1 });
TourGuideSchema.index({ languages: 1 });
TourGuideSchema.index({ 'ratingSummary.average': -1 });
TourGuideSchema.index({ isActive: 1, isVerified: 1, isAvailable: 1 });
