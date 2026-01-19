import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TransformValue } from 'src/utils/transform.util';

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

  @TransformValue()
  @IsBoolean()
  isActive: boolean;
}
