import { IsNotEmpty, IsString } from 'class-validator';

export class CreateRouterRoleDto {
  @IsString()
  @IsNotEmpty()
  roleCode: string;

  @IsString()
  @IsNotEmpty()
  routerCode: string;
}
