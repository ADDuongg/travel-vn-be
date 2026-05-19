import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransformValue } from 'src/utils/transform.util';

export class HighlightTranslationLangBlockDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

class ProvinceHighlightDto {
  @IsOptional()
  @IsObject()
  translations?: Record<string, HighlightTranslationLangBlockDto>;

  @IsOptional()
  @IsObject()
  thumbnail?: {
    url?: string;
    publicId?: string;
    alt?: string;
    order?: number;
  };
}

export class ProvinceContentDto {
  @IsOptional()
  @TransformValue()
  @IsObject()
  translations?: Record<
    string,
    {
      description?: string;
      shortDescription?: string;
      bestTimeToVisit?: string;
      seo?: {
        title?: string;
        description?: string;
        keywords?: string[];
      };
    }
  >;

  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @IsOptional()
  @TransformValue()
  @IsNumber()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @TransformValue()
  @IsEnum(['NORTH', 'CENTRAL', 'SOUTH'])
  region?: string;

  @IsOptional()
  @TransformValue()
  @IsObject()
  thumbnail?: {
    url: string;
    publicId?: string;
    alt?: string;
  };

  @IsOptional()
  @TransformValue()
  @IsArray()
  gallery?: Array<{
    url: string;
    publicId?: string;
    alt?: string;
    order?: number;
  }>;

  @IsOptional()
  @TransformValue()
  @IsNumber()
  @Min(0)
  population?: number;

  @IsOptional()
  @TransformValue()
  @IsNumber()
  @Min(0)
  area?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProvinceHighlightDto)
  highlights?: ProvinceHighlightDto[];
}
