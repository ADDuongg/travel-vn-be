import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BlogCategoryDocument = BlogCategory & Document;

/** Mã ngôn ngữ (lowercase) -> chuỗi hiển thị. */
export type DynamicLocalized = Record<string, string>;

@Schema({ collection: 'blog-categories', timestamps: true })
export class BlogCategory {
  @Prop({ type: Object, required: true })
  name: DynamicLocalized;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ type: Object, default: {} })
  description: DynamicLocalized;

  @Prop({
    type: { url: String, publicId: String, alt: String },
  })
  thumbnail?: {
    url: string;
    publicId?: string;
    alt?: string;
  };

  @Prop({ default: 0 })
  order: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  postCount: number;

  @Prop({ type: Object, default: {} })
  translations: {
    [langCode: string]: {
      seo?: {
        title?: string;
        description?: string;
        keywords?: string[];
      };
    };
  };

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;
}

export const BlogCategorySchema = SchemaFactory.createForClass(BlogCategory);
BlogCategorySchema.index({ slug: 1 }, { unique: true });
BlogCategorySchema.index({ isActive: 1, order: 1 });
BlogCategorySchema.index({ isDeleted: 1 });
BlogCategorySchema.index({ isDeleted: 1, isActive: 1, order: 1 });
