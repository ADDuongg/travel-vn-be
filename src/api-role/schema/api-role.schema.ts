import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ApiRoleDocument = ApiRole & Document;

@Schema({ collection: 'api_role', timestamps: true })
export class ApiRole {
  /**
   * Role code
   * Ví dụ: ADMIN
   */
  @Prop({ required: true, index: true })
  roleCode: string;

  /**
   * API permission code
   * Ví dụ: ROOM_DELETE
   */
  @Prop({ required: true, index: true })
  apiCode: string;
}

export const ApiRoleSchema = SchemaFactory.createForClass(ApiRole);

/**
 * 1 role chỉ gán 1 api 1 lần
 */
ApiRoleSchema.index({ roleCode: 1, apiCode: 1 }, { unique: true });
