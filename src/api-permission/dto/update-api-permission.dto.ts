import { PartialType } from '@nestjs/mapped-types';
import { CreateApiPermissionDto } from './create-api-permission.dto';

export class UpdateApiPermissionDto extends PartialType(
  CreateApiPermissionDto,
) {}
