import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Role extends Document {
  @Prop({ required: true, unique: true, index: true })
  code: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
