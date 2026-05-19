import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ApiRoleDocument = ApiRole & Document;

@Schema({ collection: 'api_role', timestamps: true })
export class ApiRole {
  @Prop({ required: true, index: true })
  roleCode: string;

  @Prop({ required: true, index: true })
  apiCode: string;
}

export const ApiRoleSchema = SchemaFactory.createForClass(ApiRole);

ApiRoleSchema.index({ roleCode: 1, apiCode: 1 }, { unique: true });
