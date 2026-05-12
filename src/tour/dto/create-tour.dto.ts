import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
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

/* =======================
   MEDIA REF DTOs (upload via /admin/media first)
======================= */

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

/* =======================
   SALE & SCHEDULE
======================= */

export class TourSaleDto {
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

export class TourFixedDepartureDto {
  @Type(() => Date)
  date: Date;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  availableSlots: number;

  @IsString()
  status: string;
}

export class TourScheduleDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departureDays?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TourFixedDepartureDto)
  fixedDepartures?: TourFixedDepartureDto[];
}

/* =======================
   SUB DTOs
======================= */

export class TourItineraryDayTranslationDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  meals?: string[];

  @IsOptional()
  @IsString()
  accommodation?: string;
}

export class TourItineraryDayDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  dayNumber: number;

  @IsObject()
  translations: Record<string, TourItineraryDayTranslationDto>;
}

export class TourDestinationDto {
  @IsString()
  provinceId: string;

  @IsOptional()
  @IsBoolean()
  isMainDestination?: boolean;
}

export class TourContactDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  hotline?: string;
}

export class TourPricingDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  childPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  infantPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  singleSupplement?: number;
}

export class TourDurationDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  days: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  nights: number;
}

export class TourCapacityDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  minGuests?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  maxGuests: number;

  @IsOptional()
  @IsBoolean()
  privateAvailable?: boolean;
}

export class TourBookingConfigDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  advanceBookingDays?: number;

  @IsOptional()
  @IsBoolean()
  allowInstantBooking?: boolean;

  @IsOptional()
  @IsBoolean()
  requireDeposit?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  depositPercent?: number;
}

export class TourSeoDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}

export class TourTranslationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  highlights?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  inclusions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exclusions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notes?: string[];

  @IsOptional()
  @IsString()
  cancellationPolicy?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TourSeoDto)
  seo?: TourSeoDto;
}

/* =======================
   MAIN DTO
======================= */

export class CreateTourDto {
  @IsString()
  slug: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsString()
  @IsEnum(['DOMESTIC', 'INTERNATIONAL', 'DAILY'])
  tourType: string;

  @ValidateNested()
  @Type(() => TourDurationDto)
  duration: TourDurationDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TourDestinationDto)
  destinations: TourDestinationDto[];

  @IsMongoId()
  departureProvinceId: string;

  @IsObject()
  translations: Record<string, TourTranslationDto>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TourItineraryDayDto)
  itinerary?: TourItineraryDayDto[];

  @ValidateNested()
  @Type(() => TourCapacityDto)
  capacity: TourCapacityDto;

  @ValidateNested()
  @Type(() => TourPricingDto)
  pricing: TourPricingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TourContactDto)
  contact?: TourContactDto;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  amenities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  transportTypes?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => TourBookingConfigDto)
  bookingConfig?: TourBookingConfigDto;

  @IsOptional()
  @IsString()
  @IsEnum(['EASY', 'MODERATE', 'CHALLENGING', 'DIFFICULT'])
  difficulty?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TourSaleDto)
  sale?: TourSaleDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TourScheduleDto)
  schedule?: TourScheduleDto;

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
