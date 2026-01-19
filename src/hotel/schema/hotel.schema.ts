import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HotelDocument = Hotel & Document;

/* =======================
   SUB SCHEMA
======================= */

@Schema({ _id: false })
export class AdministrativeUnit {
  @Prop({ required: true })
  id: string; // mã hành chính từ API VN

  @Prop({ required: true })
  type: string;
  // VD: PROVINCE | MUNICIPALITY | CAPITAL | SPECIAL | ...

  @Prop()
  name?: string; // cache tên để hiển thị / SEO
}

export const AdministrativeUnitSchema =
  SchemaFactory.createForClass(AdministrativeUnit);

/* =======================
   HOTEL SCHEMA
======================= */

@Schema({
  collection: 'hotels',
  timestamps: true,
})
export class Hotel {
  /* ================= CORE ================= */

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ default: true })
  isActive: boolean;

  /* ================= ADMINISTRATIVE (VN) ================= */

  @Prop({
    type: AdministrativeUnitSchema,
    required: true,
  })
  administrativeUnit: AdministrativeUnit;

  /* ================= LOCATION ================= */

  @Prop()
  address?: string;

  /* ================= META ================= */

  @Prop()
  description?: string;
}

export const HotelSchema = SchemaFactory.createForClass(Hotel);

/* ================= INDEX ================= */

HotelSchema.index({ slug: 1 }, { unique: true });
HotelSchema.index({ 'administrativeUnit.id': 1 });
HotelSchema.index({ isActive: 1 });
