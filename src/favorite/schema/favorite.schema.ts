import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { FavoriteEntityType } from '../favorite.types';

export type FavoriteDocument = Favorite & Document;

@Schema({
  collection: 'favorites',
  timestamps: true,
})
export class Favorite {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: FavoriteEntityType })
  entityType: FavoriteEntityType;

  @Prop({ type: Types.ObjectId, required: true })
  entityId: Types.ObjectId;
}

export const FavoriteSchema = SchemaFactory.createForClass(Favorite);

FavoriteSchema.index(
  { userId: 1, entityType: 1, entityId: 1 },
  { unique: true },
);
FavoriteSchema.index({ userId: 1, createdAt: -1 });
FavoriteSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
