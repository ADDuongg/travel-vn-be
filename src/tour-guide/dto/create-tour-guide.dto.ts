import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateTourGuideDto {
  /** Bắt buộc khi admin tạo; không gửi khi user register (dùng userId từ JWT). */
  @IsOptional()
  @IsMongoId()
  userId?: string;

  /** { "vi": { "bio": "...", "shortBio": "...", "specialties": "..." } } */
  @IsOptional()
  @IsObject()
  translations?: Record<
    string,
    { bio: string; shortBio?: string; specialties?: string }
  >;

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
  @IsNumber()
  @Min(0)
  yearsOfExperience?: number;

  @IsOptional()
  @IsArray()
  gallery?: Array<{ url: string; publicId?: string; alt?: string }>;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
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
