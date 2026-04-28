import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsString } from 'class-validator';

export class SetRolePermissionsDto {
  /** Full replacement list of `resource.action` keys from the permissions catalog (empty = no permissions). */
  @ApiProperty({ type: [String], example: ['hotel.view', 'tour.update'] })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissionKeys!: string[];
}
