// payment.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentDocument = Payment & Document;

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  FULLY_REFUNDED = 'FULLY_REFUNDED',
  ATTEMPT_FAILED = 'ATTEMPT_FAILED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

@Schema({
  collection: 'payments',
  timestamps: true,
})
export class Payment {
  @Prop({ required: true })
  provider: string; // STRIPE

  @Prop({ required: true, unique: true })
  intentId: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  currency: string;

  @Prop({
    type: String,
    enum: PaymentStatus,
    required: true,
  })
  status: PaymentStatus;

  @Prop({
    type: Types.ObjectId,
    ref: 'Booking',
    required: true,
    index: true,
  })
  bookingId: Types.ObjectId;

  @Prop({ type: [Object], default: [] })
  rawEvents?: any[];

  @Prop()
  processedAt?: Date;

  @Prop()
  chargeId?: string;

  @Prop({ default: 0 })
  refundedAmount?: number;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index(
  { providerRef: 1 },
  {
    unique: true,
    partialFilterExpression: {
      providerRef: { $exists: true, $ne: null }
    }
  }
);