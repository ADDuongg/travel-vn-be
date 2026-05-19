import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RouterRoleDocument = RouterRole & Document;

@Schema({ collection: 'router_role', timestamps: true })
export class RouterRole {
  @Prop({ required: true, index: true })
  roleCode: string;

  @Prop({ required: true, index: true })
  routerCode: string;
}

export const RouterRoleSchema = SchemaFactory.createForClass(RouterRole);

RouterRoleSchema.index({ roleCode: 1, routerCode: 1 }, { unique: true });
