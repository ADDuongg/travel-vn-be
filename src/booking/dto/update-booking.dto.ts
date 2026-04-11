import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

class UpdateBookedRoomDto {
  @IsString()
  roomId: string;

  @IsDateString()
  checkIn: string;

  @IsDateString()
  checkOut: string;

  @IsNumber()
  @Min(1)
  adults: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  children?: number;
}

class UpdateTourInfoDto {
  @IsString()
  tourId: string;

  @IsDateString()
  travelDate: string;

  @IsNumber()
  @Min(1)
  participants: number;
}

export class UpdateBookingDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateBookedRoomDto)
  rooms?: UpdateBookedRoomDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTourInfoDto)
  tourInfo?: UpdateTourInfoDto;
}
