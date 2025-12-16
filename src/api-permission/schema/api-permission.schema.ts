import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { HttpMethod } from 'src/enum/api-permission.enum';

export type ApiPermissionDocument = ApiPermission & Document;

@Schema({ collection: 'api_permission', timestamps: true })
export class ApiPermission {
  /**
   * Code dùng để check permission
   * Ví dụ: ROOM_DELETE
   */
  @Prop({ required: true, unique: true, index: true })
  code: string;

  /**
   * Tên hiển thị
   * Ví dụ: Delete Room
   */
  @Prop({ required: true })
  name: string;

  /**
   * API path
   * Ví dụ: /api/rooms/:id
   */
  @Prop({ required: true })
  path: string;

  /**
   * HTTP Method
   */
  @Prop({
    required: true,
    enum: HttpMethod,
  })
  method: HttpMethod;

  @Prop()
  description?: string;

  /**
   * Enable / disable permission
   */
  @Prop({ default: true })
  isActive: boolean;
}

export const ApiPermissionSchema = SchemaFactory.createForClass(ApiPermission);
