import { Transform } from 'class-transformer';
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
import { toBoolean, toNumber } from 'src/common/utils/transform.util';

export class CreateRoomDto {
  /* ========= CORE ========= */

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @Transform(toBoolean)
  @IsBoolean()
  isActive: boolean;

  /* ========= CAPACITY ========= */

  @Transform(toNumber)
  @IsNumber()
  maxGuests: number;

  @Transform(toNumber)
  @IsNumber()
  adults: number;

  @Transform(toNumber)
  @IsNumber()
  @IsOptional()
  children?: number;

  @Transform(toNumber)
  @IsNumber()
  @IsOptional()
  roomSize?: number;

  /* ========= PRICING ========= */

  @Transform(toNumber)
  @IsNumber()
  basePrice: number;

  @IsString()
  @IsOptional()
  currency?: string;

  /* ========= INVENTORY ========= */

  @Transform(toNumber)
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
