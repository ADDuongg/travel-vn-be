import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { BLOG_POST_STATUS, BlogPostStatus } from '../schema/blog-post.schema';

export class ThumbnailRefDto {
  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  publicId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  alt?: string;
}

export class GalleryItemDto {
  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  publicId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  alt?: string;

  @IsOptional()
  @Type(() => Number)
  order?: number;
}

export class CreateBlogPostDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  slug?: string;

  @IsOptional()
  @IsIn([BLOG_POST_STATUS.DRAFT, BLOG_POST_STATUS.PUBLISHED])
  status?: BlogPostStatus;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedProvinces?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedTours?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedHotels?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ThumbnailRefDto)
  thumbnail?: ThumbnailRefDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GalleryItemDto)
  gallery?: GalleryItemDto[];

  @IsObject()
  translations: Record<
    string,
    {
      title: string;
      excerpt: string;
      content: Array<Record<string, unknown>>;
      seo?: {
        title?: string;
        description?: string;
        keywords?: string[];
        ogImage?: string;
      };
    }
  >;
}
