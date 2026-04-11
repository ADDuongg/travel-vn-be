import { IsNotEmpty, IsString } from 'class-validator';

export class CreateRouterRoleDto {
  @IsString()
  @IsNotEmpty()
  roleCode: string; // ADMIN

  @IsString()
  @IsNotEmpty()
  routerCode: string; // ROOM_LIST
}
