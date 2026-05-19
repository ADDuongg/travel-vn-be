import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type IdempotencyDocument = Idempotency & Document;

export enum IdempotencyStatus {
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Schema({
  timestamps: true,
  collection: 'idempotency_requests',
})
export class Idempotency {
  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  endpoint: string;

  @Prop({
    required: true,
    enum: IdempotencyStatus,
    default: IdempotencyStatus.PROCESSING,
  })
  status: IdempotencyStatus;

  @Prop()
  requestHash?: string;

  @Prop({ type: Object })
  response?: any;

  @Prop({ type: Date, required: true })
  expireAt: Date;
}

export const IdempotencySchema = SchemaFactory.createForClass(Idempotency);

IdempotencySchema.index({ key: 1, userId: 1, endpoint: 1 }, { unique: true });
IdempotencySchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
