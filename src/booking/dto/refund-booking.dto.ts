import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class RefundBookingDto {
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value === 'true' : value,
  )
  @IsBoolean()
  fullyRefunded?: boolean;
}
