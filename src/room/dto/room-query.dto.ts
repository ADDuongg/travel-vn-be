import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export enum RoomSortBy {
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  RATING_DESC = 'rating_desc',
  NEWEST = 'newest',
}

export class RoomQueryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page = 1;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit = 9;

  @IsEnum(RoomSortBy)
  @IsOptional()
  sortBy?: RoomSortBy;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  minPrice?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  maxPrice?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  adults?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  children?: number;

  @IsString()
  @IsOptional()
  keyword?: string;

  @IsString()
  @IsOptional()
  lang?: string;

  @IsString()
  @IsOptional()
  checkIn?: string;

  @IsString()
  @IsOptional()
  checkOut?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  minRating?: number;

  @IsOptional()
  @Transform(({ value, obj }) => {
    const raw =
      (obj && (obj.amenities ?? obj['amenities[]'])) !== undefined
        ? (obj.amenities ?? obj['amenities[]'])
        : value;

    if (raw == null) return undefined;
    if (Array.isArray(raw))
      return raw.filter((v) => typeof v === 'string' && v.trim());
    if (typeof raw === 'string')
      return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    return undefined;
  })
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  @Transform(({ value }) => {
    if (value == null) return undefined;
    const arr = Array.isArray(value) ? value : [value];
    return arr
      .map((v: unknown) =>
        typeof v === 'string' ? parseInt(v, 10) : Number(v),
      )
      .filter((n) => !isNaN(n));
  })
  @IsArray()
  @IsNumber({}, { each: true })
  roomSize?: number[];

  @IsOptional()
  @IsString()
  provinceId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value == null) return undefined;
    if (Array.isArray(value))
      return value.filter((v) => typeof v === 'string' && v.trim());
    if (typeof value === 'string')
      return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    return undefined;
  })
  @IsArray()
  @IsString({ each: true })
  hotelIds?: string[];
}
