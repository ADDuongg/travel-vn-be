import { IsDateString, IsNumber, IsString, Min } from 'class-validator';

export class BlockSlotsDto {
  @IsString()
  tourId: string;

  @IsDateString()
  departureDate: string;

  @IsNumber()
  @Min(1)
  slots: number;
}
