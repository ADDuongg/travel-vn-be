import { IsDateString, IsNumber, IsString, Min } from 'class-validator';

export class ReleaseSlotsDto {
  @IsString()
  tourId: string;

  @IsDateString()
  departureDate: string;

  @IsNumber()
  @Min(1)
  slots: number;
}
