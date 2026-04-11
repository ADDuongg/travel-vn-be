import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransformValue } from 'src/utils/transform.util';

/* =======================
   SUB DTO
======================= */

export class HotelContactDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  website?: string;
}

export class HotelLocationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;
}

export class TranslationItemDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString({ each: true })
  policies?: string[];

  @IsOptional()
  @IsObject()
  seo?: {
    title?: string;
    description?: string;
  };
}

/* =======================
   MAIN DTO
======================= */

export class CreateHotelDto {
  @IsString()
  slug: string;

  @TransformValue()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @TransformValue()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  starRating?: number;

  @IsMongoId()
  provinceId: string;

  /** FE sends JSON string when using form-data */
  @Transform(({ value }) =>
    typeof value === 'string' ? JSON.parse(value) : value,
  )
  @IsObject()
  translations: Record<string, TranslationItemDto>;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? JSON.parse(value) : value,
  )
  @ValidateNested()
  @Type(() => HotelContactDto)
  contact?: HotelContactDto;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? JSON.parse(value) : value,
  )
  @ValidateNested()
  @Type(() => HotelLocationDto)
  location?: HotelLocationDto;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? JSON.parse(value) : value,
  )
  @IsArray()
  @IsMongoId({ each: true })
  amenities?: string[];
}
