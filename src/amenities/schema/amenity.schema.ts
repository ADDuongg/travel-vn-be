// amenities/schemas/amenity.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Amenity extends Document {
  @Prop({ required: true })
  name: string;

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

  @Prop({ default: true })
  isActive: boolean;
}

export const AmenitySchema = SchemaFactory.createForClass(Amenity);
