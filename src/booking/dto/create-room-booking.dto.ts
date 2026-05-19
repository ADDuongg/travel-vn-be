import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateRoomBookingDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsDateString()
  checkIn: string;

  @IsDateString()
  checkOut: string;

  @ValidateNested({ each: true })
  @Type(() => RoomGuestDto)
  rooms: RoomGuestDto[];
}

class RoomGuestDto {
  @IsNumber()
  @Min(1)
  adults: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  children?: number;
}
