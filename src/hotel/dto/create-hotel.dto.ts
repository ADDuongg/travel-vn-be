import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

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
  @IsNumber()
  order?: number;
}

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

export class CreateHotelDto {
  @IsString()
  slug: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  starRating?: number;

  @IsMongoId()
  provinceId: string;

  @IsObject()
  translations: Record<string, TranslationItemDto>;

  @IsOptional()
  @ValidateNested()
  @Type(() => HotelContactDto)
  contact?: HotelContactDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => HotelLocationDto)
  location?: HotelLocationDto;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  amenities?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ThumbnailRefDto)
  thumbnail?: ThumbnailRefDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GalleryItemDto)
  gallery?: GalleryItemDto[];
}
