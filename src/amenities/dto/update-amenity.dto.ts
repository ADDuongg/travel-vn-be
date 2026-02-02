import { IsBoolean, IsObject, IsOptional, IsString, Matches } from 'class-validator';
import { TransformValue } from 'src/utils/transform.util';

export class UpdateAmenityDto {
  /** Unique code for filtering (e.g. wifi, air_condition, pool). Lowercase, underscore allowed. */
  @IsOptional()
  @IsString()
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'code must be lowercase letters, numbers, underscores only, starting with a letter',
  })
  code?: string;

  @TransformValue()
  @IsObject()
  @IsOptional()
  translations?: {
    [langCode: string]: {
      name: string;
      description?: string;
    };
  };

  @TransformValue()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
