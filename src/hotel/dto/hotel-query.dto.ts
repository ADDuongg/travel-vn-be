import { Type } from 'class-transformer';
import { IsMongoId, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class HotelQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 12;

  @IsOptional()
  @IsMongoId()
  provinceId?: string;
}
