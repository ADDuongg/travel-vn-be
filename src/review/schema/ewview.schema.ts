import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReviewDocument = Review & Document;

export enum ReviewEntityType {
  ROOM = 'ROOM',
  HOTEL = 'HOTEL',
  TOUR = 'TOUR',
  BLOG = 'BLOG',
}

@Schema({
  collection: 'reviews',
  timestamps: true,
})
export class Review {
  /* ===== Target entity ===== */

  @Prop({
    required: true,
    enum: ReviewEntityType,
  })
  entityType: ReviewEntityType;

  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  entityId: Types.ObjectId;

  /* ===== Review content ===== */

  @Prop({ min: 1, max: 5 })
  rating?: number; // 1–5 stars (optional for blog)

  @Prop()
  comment?: string;

  /* ===== Reviewer ===== */

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ default: false })
  isAnonymous: boolean;

  /* ===== Moderation ===== */

  @Prop({ default: false })
  isApproved: boolean;

  @Prop()
  approvedAt?: Date;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

ReviewSchema.index({ entityType: 1, entityId: 1 });
ReviewSchema.index({ userId: 1 });
ReviewSchema.index({ isApproved: 1 });
ReviewSchema.index({ createdAt: -1 });
