import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/* ===== Media reference DTOs (FE upload ảnh qua /admin/media trước, rồi gửi reference) ===== */

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

/* ===== Nested object DTOs ===== */

export class RoomCapacityDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  baseAdults: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseChildren?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  maxAdults: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxChildren?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  roomSize?: number;
}

export class RoomBookingConfigDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  minNights: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  maxNights?: number;

  @IsBoolean()
  allowInstantBooking: boolean;
}

export class RoomSaleDto {
  @IsBoolean()
  isActive: boolean;

  @IsIn(['PERCENT', 'FIXED'])
  type: 'PERCENT' | 'FIXED';

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value: number;

  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  endDate?: Date;
}

export class RoomTranslationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;
}

/* ===== Main DTO ===== */

export class CreateRoomDto {
  /* ========= CORE ========= */

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsNotEmpty()
  roomType: string;

  @IsBoolean()
  isActive: boolean;

  /* ========= RELATION ========= */

  @IsString()
  @IsNotEmpty()
  hotelId: string;

  /* ========= CAPACITY ========= */

  @ValidateNested()
  @Type(() => RoomCapacityDto)
  capacity: RoomCapacityDto;

  /* ========= PRICING ========= */

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsOptional()
  @IsString()
  currency?: string;

  /* ========= INVENTORY ========= */

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalRooms: number;

  /* ========= TRANSLATIONS ========= */

  @IsObject()
  translations: Record<string, RoomTranslationDto>;

  /* ========= BOOKING CONFIG ========= */

  @ValidateNested()
  @Type(() => RoomBookingConfigDto)
  bookingConfig: RoomBookingConfigDto;

  /* ========= AMENITIES ========= */
  // Giữ kiểu mở giống behavior cũ: FE có thể gửi mảng ObjectId string hoặc {code, icon}.
  @IsOptional()
  @IsArray()
  amenities?: Array<string | { code: string; icon?: string }>;

  /* ========= SALE ========= */

  @IsOptional()
  @ValidateNested()
  @Type(() => RoomSaleDto)
  sale?: RoomSaleDto;

  /* ========= MEDIA (reference đã upload qua /admin/media) ========= */

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
