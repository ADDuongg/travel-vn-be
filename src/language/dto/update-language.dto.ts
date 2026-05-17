import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TransformValue } from 'src/utils/transform.util';

export class UpdateLanguageDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  flagUrl?: string;

  @TransformValue()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
