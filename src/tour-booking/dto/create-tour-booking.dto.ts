import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class GuestInfoDto {
  @IsString()
  fullName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateTourBookingDto {
  @IsString()
  tourId: string;

  @IsOptional()
  @IsString()
  guideId?: string;

  @IsDateString()
  departureDate: string;

  @ValidateNested()
  @Type(() => GuestInfoDto)
  guest: GuestInfoDto;

  @IsNumber()
  @Min(1)
  adults: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  children?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  infants?: number;

  /* userId lấy từ JWT (req.user), không gửi từ payload */
}
