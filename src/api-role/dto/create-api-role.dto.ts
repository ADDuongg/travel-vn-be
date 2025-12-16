// dto/create-api-role.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateApiRoleDto {
  @ApiProperty({ example: 'ADMIN' })
  @IsString()
  @IsNotEmpty()
  roleCode: string;

  @ApiProperty({ example: 'ROOM_DELETE' })
  @IsString()
  @IsNotEmpty()
  apiCode: string;
}
