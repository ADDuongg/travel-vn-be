import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePaymentIntentTourDto {
  @IsString()
  @IsNotEmpty()
  tourBookingId: string;
}
