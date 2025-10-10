import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class RefreshToken {
  @Prop({ required: true, unique: true, index: true }) jti: string;
  @Prop({ type: Types.ObjectId, ref: 'User', index: true, required: true })
  userId: Types.ObjectId;
  @Prop({ required: true, index: true }) familyId: string;
  @Prop({ default: false, index: true }) isRevoked: boolean;
  @Prop({ type: Date, default: null }) usedAt?: Date | null;
  @Prop({ type: Date, required: true, index: true }) expiresAt: Date;
  @Prop({ type: String, default: null }) replacedBy?: string | null;
  @Prop({ type: Date, index: true }) keepUntil?: Date;
}
export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
// TTL index
RefreshTokenSchema.index({ keepUntil: 1 }, { expireAfterSeconds: 0 });
