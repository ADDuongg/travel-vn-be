import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from 'src/user/schema/user.schema';
import { BlogCategory } from 'src/blog-category/schema/blog-category.schema';
import { BlogTag } from 'src/blog-tag/schema/blog-tag.schema';
import { Province } from 'src/provinces/schema/province.schema';
import { Tour } from 'src/tour/schema/tour.schema';
import { Hotel } from 'src/hotel/schema/hotel.schema';
import type { TocItem } from '../blog.utils';

export type BlogPostDocument = BlogPost & Document;

export const BLOG_POST_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
} as const;
export type BlogPostStatus =
  (typeof BLOG_POST_STATUS)[keyof typeof BLOG_POST_STATUS];

export type BlogPostTranslation = {
  title: string;
  excerpt: string;
  content: Array<{
    id: string;
    type: string;
    data?: Record<string, unknown>;
  }>;
  tableOfContents: TocItem[];
  readingTime: number;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
  };
};

@Schema({ _id: false })
export class GalleryItem {
  @Prop()
  url: string;

  @Prop()
  publicId?: string;

  @Prop()
  alt?: string;

  @Prop()
  order?: number;
}
export const GalleryItemSchema = SchemaFactory.createForClass(GalleryItem);

@Schema({ collection: 'blog-posts', timestamps: true })
export class BlogPost {
  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({
    required: true,
    enum: [BLOG_POST_STATUS.DRAFT, BLOG_POST_STATUS.PUBLISHED],
    default: BLOG_POST_STATUS.DRAFT,
  })
  status: BlogPostStatus;

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  author: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: BlogCategory.name })
  category?: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], ref: BlogTag.name, default: [] })
  tags: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], ref: Province.name, default: [] })
  relatedProvinces: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], ref: Tour.name, default: [] })
  relatedTours: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], ref: Hotel.name, default: [] })
  relatedHotels: Types.ObjectId[];

  @Prop({
    type: { url: String, publicId: String, alt: String },
  })
  thumbnail?: { url: string; publicId?: string; alt?: string };

  @Prop({ type: [GalleryItemSchema], default: [] })
  gallery: Array<{
    url: string;
    publicId?: string;
    alt?: string;
    order?: number;
  }>;

  @Prop({ type: Object, required: true, default: {} })
  translations: Record<string, BlogPostTranslation>;

  @Prop({ default: 0 })
  viewCount: number;

  @Prop()
  publishedAt?: Date;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;
}

export const BlogPostSchema = SchemaFactory.createForClass(BlogPost);
BlogPostSchema.index({ slug: 1 }, { unique: true });
BlogPostSchema.index({ status: 1, publishedAt: -1 });
BlogPostSchema.index({ category: 1, status: 1 });
BlogPostSchema.index({ tags: 1, status: 1 });
BlogPostSchema.index({ relatedProvinces: 1, status: 1 });
BlogPostSchema.index({ isFeatured: 1, status: 1 });
BlogPostSchema.index({ isDeleted: 1 });
BlogPostSchema.index(
  { 'translations.vi.title': 'text', 'translations.en.title': 'text' },
  { name: 'blog_post_title_text' },
);
