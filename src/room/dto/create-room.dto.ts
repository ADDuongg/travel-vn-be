import { Transform, Type } from 'class-transformer';
import {
  Allow,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { TransformValue } from 'src/utils/transform.util';

export class CreateRoomDto {
  /* ========= CORE ========= */

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @TransformValue()
  @IsBoolean()
  isActive: boolean;

  /* ========= CAPACITY ========= */
  @TransformValue()
  @IsObject()
  capacity: {
    baseAdults: number;
    baseChildren?: number;
    maxAdults: number;
    maxChildren?: number;
    roomSize?: number;
  };

  @IsString()
  @IsNotEmpty()
  hotelId: string;

  /* ========= PRICING ========= */

  @TransformValue()
  // @Transform(toNumber)
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  basePrice: number;

  @IsString()
  @IsOptional()
  currency?: string;

  /* ========= INVENTORY ========= */

  @TransformValue()
  // @Transform(toNumber)
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalRooms: number;

  /* ========= TRANSLATIONS ========= */
  // FE gửi JSON string
  @Transform(({ value }) => JSON.parse(value))
  @IsObject()
  translations: Record<
    string,
    {
      name: string;
      description: string;
      shortDescription?: string;
    }
  >;

  /* ========= BOOKING CONFIG ========= */
  @Transform(({ value }) => JSON.parse(value))
  @IsObject()
  bookingConfig: {
    minNights: number;
    maxNights?: number;
    allowInstantBooking: boolean;
  };

  /* ========= AMENITIES ========= */

  //   @Transform(toArray)
  @IsArray()
  @IsOptional()
  amenities?: { code: string; icon?: string }[];

  /* ========= SALE ========= */
  @Transform(({ value }) => {
    if (!value) return undefined;

    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return undefined;
      }
    }

    return value;
  })
  @IsOptional()
  @IsObject()
  @Allow()
  sale?: {
    isActive: boolean;
    type: 'PERCENT' | 'FIXED';
    value: number;
    startDate?: Date;
    endDate?: Date;
  };
}
