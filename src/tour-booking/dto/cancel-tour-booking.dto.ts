import { IsOptional, IsString } from 'class-validator';

export class CancelTourBookingDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
