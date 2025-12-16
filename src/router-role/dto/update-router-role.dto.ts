import { PartialType } from '@nestjs/swagger';
import { CreateRouterRoleDto } from './create-router-role.dto';

export class UpdateRouterRoleDto extends PartialType(CreateRouterRoleDto) {}
