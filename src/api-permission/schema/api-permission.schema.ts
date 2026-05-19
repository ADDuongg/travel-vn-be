import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { HttpMethod } from 'src/enum/api-permission.enum';

export type ApiPermissionDocument = ApiPermission & Document;

@Schema({ collection: 'api_permission', timestamps: true })
export class ApiPermission {
  @Prop({ required: true, unique: true, index: true })
  code: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  path: string;

  @Prop({
    required: true,
    enum: HttpMethod,
  })
  method: HttpMethod;

  @Prop()
  description?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const ApiPermissionSchema = SchemaFactory.createForClass(ApiPermission);
