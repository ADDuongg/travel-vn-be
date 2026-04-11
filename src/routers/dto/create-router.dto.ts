import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateRouterDto {
  @IsString()
  @IsNotEmpty()
  code: string; // ROOM_LIST

  @IsString()
  @IsNotEmpty()
  name: string; // Room List

  @IsString()
  @IsNotEmpty()
  path: string; // /dashboard/room

  @IsOptional()
  @IsString()
  parentCode?: string; // DASHBOARD

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
