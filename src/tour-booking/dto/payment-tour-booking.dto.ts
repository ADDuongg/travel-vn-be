import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class PaymentTourBookingDto {
  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsNumber()
  @Min(0)
  amount: number;
}
