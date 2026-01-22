// bookings/dto/booking-query.dto.ts
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  BookingPaymentStatus,
  BookingStatus,
  BookingType,
} from '../schema/booking.schema';

export class SortDto {
  @IsString()
  by: string;

  @IsIn(['asc', 'desc'])
  dir: 'asc' | 'desc';
}

export class BookingQueryDto {
  /* pagination (0-based) */
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  pageIndex = 0;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  pageSize = 10;

  /* search */
  @IsString()
  @IsOptional()
  q?: string;

  /* filters */
  @IsOptional()
  @IsIn(Object.values(BookingStatus))
  status?: BookingStatus;

  @IsOptional()
  @IsIn(Object.values(BookingPaymentStatus))
  paymentStatus?: BookingPaymentStatus;

  @IsOptional()
  @IsIn(Object.values(BookingType))
  bookingType?: BookingType = BookingType.ROOM;

  /* sorting */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SortDto)
  @IsOptional()
  sort?: SortDto[];
}
