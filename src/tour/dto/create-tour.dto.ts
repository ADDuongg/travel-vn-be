import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { TransformValue } from 'src/utils/transform.util';

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
  @IsMongoId()
  provinceId: string;

  @TransformValue()
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

  @TransformValue()
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

  @TransformValue()
  @IsOptional()
  @IsBoolean()
  allowInstantBooking?: boolean;

  @TransformValue()
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

  @TransformValue()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsString()
  @IsEnum(['DOMESTIC', 'INTERNATIONAL', 'DAILY'])
  tourType: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? JSON.parse(value) : value,
  )
  @ValidateNested()
  @Type(() => TourDurationDto)
  duration: TourDurationDto;

  @Transform(({ value }) =>
    typeof value === 'string' ? JSON.parse(value) : value,
  )
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TourDestinationDto)
  destinations: TourDestinationDto[];

  @IsMongoId()
  departureProvinceId: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? JSON.parse(value) : value,
  )
  @IsObject()
  translations: Record<string, TourTranslationDto>;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? JSON.parse(value) : value,
  )
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TourItineraryDayDto)
  itinerary?: TourItineraryDayDto[];

  @Transform(({ value }) =>
    typeof value === 'string' ? JSON.parse(value) : value,
  )
  @ValidateNested()
  @Type(() => TourCapacityDto)
  capacity: TourCapacityDto;

  @Transform(({ value }) =>
    typeof value === 'string' ? JSON.parse(value) : value,
  )
  @ValidateNested()
  @Type(() => TourPricingDto)
  pricing: TourPricingDto;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? JSON.parse(value) : value,
  )
  @ValidateNested()
  @Type(() => TourContactDto)
  contact?: TourContactDto;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? JSON.parse(value) : value,
  )
  @IsArray()
  @IsMongoId({ each: true })
  amenities?: string[];

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? JSON.parse(value) : value,
  )
  @IsArray()
  @IsString({ each: true })
  transportTypes?: string[];

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? JSON.parse(value) : value,
  )
  @ValidateNested()
  @Type(() => TourBookingConfigDto)
  bookingConfig?: TourBookingConfigDto;

  @IsOptional()
  @IsString()
  @IsEnum(['EASY', 'MODERATE', 'CHALLENGING', 'DIFFICULT'])
  difficulty?: string;
}
