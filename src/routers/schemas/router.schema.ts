import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RouterDocument = Router & Document;

@Schema({ collection: 'router', timestamps: true })
export class Router {
  /**
   * Code dùng để check permission (map với FE ROUTE_KEYS)
   * Ví dụ: ROOM_LIST
   */
  @Prop({ required: true, unique: true, index: true })
  code: string;

  /**
   * Tên hiển thị trên sidebar
   * Ví dụ: Room List
   */
  @Prop({ required: true })
  name: string;

  /**
   * Path FE
   * Ví dụ: /dashboard/room
   */
  @Prop({ required: true })
  path: string;

  /**
   * Router cha (submenu)
   * Ví dụ: DASHBOARD
   */
  @Prop({ index: true })
  parentCode?: string;

  /**
   * Thứ tự hiển thị
   */
  @Prop({ default: 0 })
  order: number;

  /**
   * Enable / disable router
   */
  @Prop({ default: true })
  isActive: boolean;
}

export const RouterSchema = SchemaFactory.createForClass(Router);
