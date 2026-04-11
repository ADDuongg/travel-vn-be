// amenity.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AmenityDocument = Amenity & Document;

@Schema({ timestamps: true })
export class Amenity {
  @Prop({ default: true })
  isActive: boolean;

  /** Optional code for filtering (e.g. wifi, air_condition, pool) */
  @Prop({ sparse: true, unique: true })
  code?: string;

  @Prop({
    type: Object,
    required: true,
  })
  translations: {
    [langCode: string]: {
      name: string;
      description?: string;
      shortDescription?: string;
    };
  };

  @Prop({
    type: {
      url: String,
      publicId: String,
    },
  })
  icon?: {
    url: string;
    publicId: string;
  };
}

export const AmenitySchema = SchemaFactory.createForClass(Amenity);
