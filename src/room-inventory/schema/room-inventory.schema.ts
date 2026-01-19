import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Room } from '../../room/schema/room.schema';

export type RoomInventoryDocument = RoomInventory & Document;

/* nhớ rằng RoomInventory là snapshot trong ngày  */

@Schema({
  timestamps: true,
  collection: 'room_inventories',
})
export class RoomInventory {
  @Prop({
    type: Types.ObjectId,
    ref: Room.name,
    required: true,
    index: true,
  })
  roomId: Types.ObjectId;

  @Prop({
    type: Date,
    required: true,
    index: true,
  })
  date: Date;

  /* total này là số phòng cho thuê trong ngày */
  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  total: number;

  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  available: number;
}

export const RoomInventorySchema = SchemaFactory.createForClass(RoomInventory);
RoomInventorySchema.index({ roomId: 1, date: 1 }, { unique: true });
