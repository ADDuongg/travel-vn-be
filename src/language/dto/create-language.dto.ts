import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { toBoolean } from 'src/common/utils/transform.util';

export class CreateLanguageDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  flagUrl?: string;

  @Transform(toBoolean)
  @IsBoolean()
  isActive: boolean;
}
