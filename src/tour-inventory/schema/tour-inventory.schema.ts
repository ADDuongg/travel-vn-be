import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Tour } from 'src/tour/schema/tour.schema';

export type TourInventoryDocument = TourInventory & Document;

export enum TourInventoryStatus {
  AVAILABLE = 'AVAILABLE',
  LIMITED = 'LIMITED',
  FULL = 'FULL',
  CANCELLED = 'CANCELLED',
}

@Schema({
  timestamps: true,
  collection: 'tour_inventories',
})
export class TourInventory {
  @Prop({
    type: Types.ObjectId,
    ref: Tour.name,
    required: true,
    index: true,
  })
  tourId: Types.ObjectId;

  @Prop({
    type: Date,
    required: true,
    index: true,
  })
  departureDate: Date;

  /** Tổng số chỗ cho ngày khởi hành này */
  @Prop({ type: Number, required: true, min: 0 })
  totalSlots: number;

  /** Số chỗ còn trống */
  @Prop({ type: Number, required: true, min: 0 })
  availableSlots: number;

  @Prop({
    type: String,
    enum: TourInventoryStatus,
    default: TourInventoryStatus.AVAILABLE,
  })
  status: TourInventoryStatus;

  /** Giá đặc biệt theo ngày (optional). Nếu null dùng giá tour. */
  @Prop()
  specialPrice?: number;

  @Prop({ default: 'VND' })
  currency: string;
}

export const TourInventorySchema =
  SchemaFactory.createForClass(TourInventory);

TourInventorySchema.index({ tourId: 1, departureDate: 1 }, { unique: true });
TourInventorySchema.index({ departureDate: 1, status: 1 });
