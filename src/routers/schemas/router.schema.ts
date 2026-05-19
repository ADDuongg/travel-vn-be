import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RouterDocument = Router & Document;

@Schema({ collection: 'router', timestamps: true })
export class Router {
  @Prop({ required: true, unique: true, index: true })
  code: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  path: string;

  @Prop({ index: true })
  parentCode?: string;

  @Prop({ default: 0 })
  order: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const RouterSchema = SchemaFactory.createForClass(Router);
