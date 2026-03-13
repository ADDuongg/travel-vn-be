import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { TransformValue } from 'src/utils/transform.util';

export class UpdateTourDto {
  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @TransformValue()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @IsEnum(['DOMESTIC', 'INTERNATIONAL', 'DAILY'])
  tourType?: string;

  @TransformValue()
  @IsOptional()
  @IsObject()
  duration?: {
    days?: number;
    nights?: number;
  };

  @TransformValue()
  @IsOptional()
  @IsArray()
  destinations?: Array<{
    provinceId: string;
    isMainDestination?: boolean;
  }>;

  @IsOptional()
  @IsMongoId()
  departureProvinceId?: string;

  @TransformValue()
  @IsOptional()
  @IsObject()
  translations?: Record<string, any>;

  @TransformValue()
  @IsOptional()
  @IsArray()
  itinerary?: Array<{
    dayNumber?: number;
    translations?: Record<string, any>;
  }>;

  @TransformValue()
  @IsOptional()
  @IsObject()
  capacity?: {
    minGuests?: number;
    maxGuests?: number;
    privateAvailable?: boolean;
  };

  @TransformValue()
  @IsOptional()
  @IsObject()
  pricing?: {
    basePrice?: number;
    currency?: string;
    childPrice?: number;
    infantPrice?: number;
    singleSupplement?: number;
  };

  @TransformValue()
  @IsOptional()
  @IsObject()
  contact?: {
    phone?: string;
    email?: string;
    hotline?: string;
  };

  @TransformValue()
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  amenities?: string[];

  @TransformValue()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  transportTypes?: string[];

  @TransformValue()
  @IsOptional()
  @IsObject()
  bookingConfig?: Record<string, any>;

  @IsOptional()
  @IsString()
  @IsEnum(['EASY', 'MODERATE', 'CHALLENGING', 'DIFFICULT'])
  difficulty?: string;
}
