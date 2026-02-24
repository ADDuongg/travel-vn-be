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
  /* ===== ROOM ===== */

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

  /* userId lấy từ JWT (req.user), không gửi từ payload */
  /* @Validate(MaxStayValidator)
  _maxStayCheck: boolean; */
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
