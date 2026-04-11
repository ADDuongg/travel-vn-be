import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateTourBookingDto {
  /* ===== TOUR ===== */

  @IsString()
  @IsNotEmpty()
  tourId: string;

  @IsDateString()
  travelDate: string;

  @IsNumber()
  @Min(1)
  participants: number;

  /* ===== USER (OPTIONAL) ===== */

  @IsOptional()
  @IsString()
  userId?: string;
}
