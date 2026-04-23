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

class LocalizedTextDto {
  @IsString()
  @TransformValue()
  vi: string;

  @IsString()
  @TransformValue()
  en: string;
}

class ProvinceHighlightDto {
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @IsOptional()
  @IsObject()
  thumbnail?: {
    url: string;
    publicId?: string;
    alt?: string;
    order?: number;
  };

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  description?: LocalizedTextDto;
}

export class UpdateProvinceDto {
  @IsOptional()
  @TransformValue()
  @IsObject()
  translations?: Record<
    string,
    {
      description?: string;
      shortDescription?: string;
      seo?: {
        title?: string;
        description?: string;
        keywords?: string[];
      };
    }
  >;

  @IsOptional()
  @TransformValue()
  @IsBoolean()
  isPopular?: boolean;

  @IsOptional()
  @TransformValue()
  @IsNumber()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @TransformValue()
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
  @TransformValue()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  bestTimeToVisit?: LocalizedTextDto;

  @IsOptional()
  @TransformValue()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProvinceHighlightDto)
  highlights?: ProvinceHighlightDto[];
}
