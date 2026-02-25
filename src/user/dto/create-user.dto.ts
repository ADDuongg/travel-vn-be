import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEmail,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { TransformValue } from 'src/utils/transform.util';

class AvatarDto {
  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  publicId?: string;
}

class AddressDto {
  @IsOptional()
  @IsMongoId()
  provinceId?: string;

  @IsOptional()
  @IsString()
  districtCode?: string;

  @IsOptional()
  @IsString()
  wardCode?: string;

  @IsOptional()
  @IsString()
  detail?: string;
}

class PermissionsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  routers?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  apis?: string[];
}

export class CreateUserDto {
  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PermissionsDto)
  permissions?: PermissionsDto;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AvatarDto)
  avatar?: AvatarDto;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value && typeof value === 'string' ? new Date(value) : undefined,
  )
  @Type(() => Date)
  @IsDate()
  dateOfBirth?: Date;

  @IsOptional()
  @IsIn(['male', 'female', 'other'])
  gender?: 'male' | 'female' | 'other';

  @IsOptional()
  @TransformValue()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;
}
