import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LanguageDocument = Language & Document;

@Schema({
  collection: 'languages',
  timestamps: true,
})
export class Language {
  @Prop({ required: true, unique: true, uppercase: true })
  code: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  flagUrl?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const LanguageSchema = SchemaFactory.createForClass(Language);
