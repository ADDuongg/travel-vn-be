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
} from 'class-validator';
import { TransformValue } from 'src/utils/transform.util';

/** Một block translation theo mã ngôn ngữ (giống Room). */
export interface TourGuideTranslationDto {
  bio?: string;
  shortBio?: string;
  specialties?: string;
  specialtyItems?: string[];
}

export class CreateTourGuideDto {
  /** Bắt buộc khi admin tạo; không gửi khi user register (dùng userId từ JWT). */
  @IsOptional()
  @IsMongoId()
  userId?: string;

  /** Theo langCode (vi, en, ...): bio, shortBio, specialties, shortDescription, description, specialtyItems — giống Room */
  @IsOptional()
  @TransformValue()
  @IsObject()
  translations?: Record<string, TourGuideTranslationDto>;

  @IsOptional()
  @TransformValue()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @TransformValue()
  @IsArray()
  @IsMongoId({ each: true })
  specializedProvinces?: string[];

  @IsOptional()
  @TransformValue()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @TransformValue()
  @IsNumber()
  @Min(0)
  yearsOfExperience?: number;

  @IsOptional()
  @TransformValue()
  @IsArray()
  gallery?: Array<{ url: string; publicId?: string; alt?: string }>;

  /** Thống kê: tỷ lệ phản hồi (0–100). */
  @IsOptional()
  @TransformValue()
  @IsNumber()
  @Min(0)
  @Max(100)
  responseRate?: number;

  /** Thống kê: số chuyến đi hoàn tất. */
  @IsOptional()
  @TransformValue()
  @IsNumber()
  @Min(0)
  completedTripsCount?: number;

  /** Thống kê: tỷ lệ khách quay lại (0–100). */
  @IsOptional()
  @TransformValue()
  @IsNumber()
  @Min(0)
  @Max(100)
  returningCustomerRate?: number;

  @IsOptional()
  @TransformValue()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @TransformValue()
  @IsNumber()
  @Min(0)
  dailyRate?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @TransformValue()
  @IsArray()
  @IsString({ each: true })
  contactMethods?: string[];
}
