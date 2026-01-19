import { IsBoolean, IsObject, IsOptional } from 'class-validator';
import { TransformValue } from 'src/utils/transform.util';

export class UpdateAmenityDto {
  @TransformValue()
  @IsObject()
  translations: {
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
