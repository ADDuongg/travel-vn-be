import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProvinceDocument = Province & Document;

@Schema({ _id: false })
export class LocalizedName {
  @Prop()
  vi: string;

  @Prop()
  en: string;
}

export const LocalizedNameSchema = SchemaFactory.createForClass(LocalizedName);

@Schema({ _id: false })
export class Ward {
  @Prop()
  type: string;

  @Prop()
  code: string;

  @Prop()
  slug: string;

  @Prop({ type: LocalizedNameSchema })
  name: LocalizedName;
}

export const WardSchema = SchemaFactory.createForClass(Ward);

@Schema({ collection: 'provinces' })
export class Province {
  @Prop({ default: 'province' })
  type: string;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  slug: string;

  @Prop({ type: LocalizedNameSchema, required: true })
  name: LocalizedName;

  @Prop({ type: LocalizedNameSchema })
  fullName?: LocalizedName;

  @Prop({ type: [WardSchema], default: [] })
  wards: Ward[];
}

export const ProvinceSchema = SchemaFactory.createForClass(Province);

ProvinceSchema.index({ code: 1 });
ProvinceSchema.index({ slug: 1 });
ProvinceSchema.index({ type: 1 });
