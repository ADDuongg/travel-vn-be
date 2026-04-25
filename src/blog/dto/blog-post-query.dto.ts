import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum BlogPostSort {
  LATEST = 'latest',
  POPULAR = 'popular',
  OLDEST = 'oldest',
}

export class BlogPostQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 12;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string; // category slug

  @IsOptional()
  @IsString()
  tag?: string; // tag slug

  @IsOptional()
  @IsString()
  province?: string; // province slug

  @IsOptional()
  @IsEnum(BlogPostSort)
  sort?: BlogPostSort = BlogPostSort.LATEST;

  @IsOptional()
  @IsString()
  lang?: string;
}
