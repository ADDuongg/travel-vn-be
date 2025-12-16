import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { HttpMethod } from 'src/enum/api-permission.enum';

export class CreateApiPermissionDto {
  @IsString()
  @IsNotEmpty()
  code: string; // ROOM_DELETE

  @IsString()
  @IsNotEmpty()
  name: string; // Delete Room

  @IsString()
  @IsNotEmpty()
  path: string; // /api/rooms/:id

  @IsEnum(HttpMethod)
  method: HttpMethod;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
