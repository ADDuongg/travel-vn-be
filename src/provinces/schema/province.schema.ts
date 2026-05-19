import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProvinceDocument = Province & Document;

export type DynamicLocalized = Record<string, string>;

@Schema({ _id: false })
export class Ward {
  @Prop()
  type: string;

  @Prop()
  code: string;

  @Prop()
  slug: string;

  @Prop({ type: Object, required: true })
  name: DynamicLocalized;
}

export const WardSchema = SchemaFactory.createForClass(Ward);

export type ProvinceHighlightTranslationBlock = {
  name: string;
  description?: string;
};

@Schema({ _id: false })
export class ProvinceHighlight {
  @Prop({ type: Object, required: true })
  translations: Record<string, ProvinceHighlightTranslationBlock>;

  @Prop({
    type: { url: String, publicId: String, alt: String, order: Number },
  })
  thumbnail?: {
    url: string;
    publicId?: string;
    alt?: string;
    order?: number;
  };
}

export const ProvinceHighlightSchema =
  SchemaFactory.createForClass(ProvinceHighlight);

@Schema({ collection: 'provinces', timestamps: true })
export class Province {
  @Prop({ default: 'province' })
  type: string;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  slug: string;

  @Prop({ type: Object, required: true })
  name: DynamicLocalized;

  @Prop({ type: Object })
  fullName?: DynamicLocalized;

  @Prop({ type: [WardSchema], default: [] })
  wards: Ward[];

  @Prop()
  population?: number;

  @Prop()
  area?: number;

  @Prop({ type: [ProvinceHighlightSchema], default: [] })
  highlights?: ProvinceHighlight[];

  @Prop({
    type: { url: String, publicId: String, alt: String },
  })
  thumbnail?: {
    url: string;
    publicId?: string;
    alt?: string;
  };

  @Prop({
    type: [{ url: String, publicId: String, alt: String, order: Number }],
    default: [],
  })
  gallery: Array<{
    url: string;
    publicId?: string;
    alt?: string;
    order?: number;
  }>;

  @Prop({ type: Object, default: {} })
  translations: {
    [langCode: string]: {
      description?: string;
      shortDescription?: string;
      bestTimeToVisit?: string;
      seo?: {
        title?: string;
        description?: string;
        keywords?: string[];
      };
    };
  };

  @Prop({ default: false })
  isPopular: boolean;

  @Prop({ default: 0 })
  displayOrder: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: String, enum: ['NORTH', 'CENTRAL', 'SOUTH'] })
  region?: string;
}

export const ProvinceSchema = SchemaFactory.createForClass(Province);

ProvinceSchema.index({ code: 1 });
ProvinceSchema.index({ slug: 1 });
ProvinceSchema.index({ type: 1 });
ProvinceSchema.index({ isActive: 1 });
ProvinceSchema.index({ isPopular: 1 });
ProvinceSchema.index({ region: 1 });
ProvinceSchema.index({ displayOrder: 1 });
ProvinceSchema.index({ isActive: 1, isPopular: 1, displayOrder: 1 });
