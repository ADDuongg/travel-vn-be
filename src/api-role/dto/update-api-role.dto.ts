import { PartialType } from '@nestjs/swagger';
import { CreateApiRoleDto } from './create-api-role.dto';

export class UpdateApiRoleDto extends PartialType(CreateApiRoleDto) {}
