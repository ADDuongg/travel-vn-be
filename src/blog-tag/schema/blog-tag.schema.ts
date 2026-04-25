import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BlogTagDocument = BlogTag & Document;

export type DynamicLocalized = Record<string, string>;

@Schema({ collection: 'blog-tags', timestamps: true })
export class BlogTag {
  @Prop({ type: Object, required: true })
  name: DynamicLocalized;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  postCount: number;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;
}

export const BlogTagSchema = SchemaFactory.createForClass(BlogTag);
BlogTagSchema.index({ slug: 1 }, { unique: true });
BlogTagSchema.index({ isActive: 1, slug: 1 });
BlogTagSchema.index({ isDeleted: 1 });
