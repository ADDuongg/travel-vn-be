import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum TourSortBy {
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  DURATION_ASC = 'duration_asc',
  DURATION_DESC = 'duration_desc',
  RATING = 'rating',
  NEWEST = 'newest',
}

export class TourQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 12;

  @IsOptional()
  @IsMongoId()
  destinationId?: string;

  @IsOptional()
  @IsMongoId()
  departureProvinceId?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['DOMESTIC', 'INTERNATIONAL', 'DAILY'])
  tourType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  minDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @IsOptional()
  @IsString()
  @IsEnum(['EASY', 'MODERATE', 'CHALLENGING', 'DIFFICULT'])
  difficulty?: string;

  @IsOptional()
  @IsEnum(TourSortBy)
  sortBy?: TourSortBy = TourSortBy.NEWEST;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  @IsString({ each: true })
  transportTypes?: string[];
}
