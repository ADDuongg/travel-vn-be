import { IsBoolean, IsObject, IsOptional } from 'class-validator';
import { TransformValue } from 'src/utils/transform.util';

export class CreateAmenityDto {
  @TransformValue()
  @IsObject()
  translations: {
    [langCode: string]: {
      name: string;
      description?: string;
    };
  };

  @IsOptional()
  @IsBoolean()
  @TransformValue()
  isActive?: boolean;
}
