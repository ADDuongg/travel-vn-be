import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RouterRoleDocument = RouterRole & Document;

@Schema({ collection: 'router_role', timestamps: true })
export class RouterRole {
  /**
   * Role code
   * Ví dụ: ADMIN
   */
  @Prop({ required: true, index: true })
  roleCode: string;

  /**
   * Router code
   * Ví dụ: ROOM_LIST
   */
  @Prop({ required: true, index: true })
  routerCode: string;
}

export const RouterRoleSchema = SchemaFactory.createForClass(RouterRole);

/**
 * Mỗi role chỉ được gán 1 router 1 lần
 */
RouterRoleSchema.index({ roleCode: 1, routerCode: 1 }, { unique: true });
