import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
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

/** Một block translation theo mã ngôn ngữ (giống Room). */
export interface TourGuideTranslationDto {
  bio?: string;
  shortBio?: string;
  specialties?: string;
  specialtyItems?: string[];
}

/* ===== Media reference DTOs (upload qua MediaModule trước, CRUD chỉ nhận JSON refs) ===== */

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
  @IsInt()
  @Min(0)
  order?: number;
}

export class CvRefDto {
  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  publicId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  filename?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  format?: string;
}

export class CreateTourGuideDto {
  /** Bắt buộc khi admin tạo; không gửi khi user register (dùng userId từ JWT). */
  @IsOptional()
  @IsMongoId()
  userId?: string;

  /** Theo langCode (vi, en, ...): bio, shortBio, specialties, shortDescription, description, specialtyItems — giống Room */
  @IsOptional()
  @IsObject()
  translations?: Record<string, TourGuideTranslationDto>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  specializedProvinces?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  yearsOfExperience?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GalleryItemDto)
  gallery?: GalleryItemDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CvRefDto)
  cv?: CvRefDto | null;

  /** Thống kê: tỷ lệ phản hồi (0–100). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  responseRate?: number;

  /** Thống kê: số chuyến đi hoàn tất. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  completedTripsCount?: number;

  /** Thống kê: tỷ lệ khách quay lại (0–100). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  returningCustomerRate?: number;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  dailyRate?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contactMethods?: string[];
}
