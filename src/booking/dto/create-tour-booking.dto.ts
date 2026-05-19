import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateTourBookingDto {
  @IsString()
  @IsNotEmpty()
  tourId: string;

  @IsDateString()
  travelDate: string;

  @IsNumber()
  @Min(1)
  participants: number;

  @IsOptional()
  @IsString()
  userId?: string;
}
