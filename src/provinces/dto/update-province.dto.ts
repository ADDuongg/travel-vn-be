import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  Min,
} from 'class-validator';
import { TransformValue } from 'src/utils/transform.util';

export class UpdateProvinceDto {
  @IsOptional()
  @TransformValue()
  @IsObject()
  translations?: Record<
    string,
    {
      description?: string;
      shortDescription?: string;
      seo?: {
        title?: string;
        description?: string;
        keywords?: string[];
      };
    }
  >;

  @IsOptional()
  @TransformValue()
  @IsBoolean()
  isPopular?: boolean;

  @IsOptional()
  @TransformValue()
  @IsNumber()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @TransformValue()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @TransformValue()
  @IsEnum(['NORTH', 'CENTRAL', 'SOUTH'])
  region?: string;

  @IsOptional()
  @TransformValue()
  @IsArray()
  gallery?: Array<{
    url: string;
    publicId?: string;
    alt?: string;
    order?: number;
  }>;
}
