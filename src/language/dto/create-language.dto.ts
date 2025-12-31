import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

  @IsBoolean()
  isActive: boolean;
}
