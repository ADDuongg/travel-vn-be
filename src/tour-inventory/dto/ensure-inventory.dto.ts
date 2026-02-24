import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class EnsureTourInventoryDto {
  @IsString()
  tourId: string;

  @IsDateString()
  departureDate: string;

  @IsNumber()
  @Min(1)
  totalSlots: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  specialPrice?: number;
}
