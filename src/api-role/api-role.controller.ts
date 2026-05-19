import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiRoleService } from './api-role.service';
import { CreateApiRoleDto } from './dto/create-api-role.dto';

@Controller('api-roles')
export class ApiRoleController {
  constructor(private readonly apiRoleService: ApiRoleService) {}

  @Post()
  create(@Body() dto: CreateApiRoleDto) {
    return this.apiRoleService.create(dto.roleCode, dto.apiCode);
  }

  @Get()
  findAll() {
    return this.apiRoleService.findAll();
  }

  @Get('role/:roleCode')
  findByRole(@Param('roleCode') roleCode: string) {
    return this.apiRoleService.findByRole(roleCode);
  }

  @Delete(':roleCode/:apiCode')
  remove(
    @Param('roleCode') roleCode: string,
    @Param('apiCode') apiCode: string,
  ) {
    return this.apiRoleService.remove(roleCode, apiCode);
  }

  @Post('replace/:roleCode')
  replace(
    @Param('roleCode') roleCode: string,
    @Body('apiCodes') apiCodes: string[],
  ) {
    return this.apiRoleService.replaceByRole(roleCode, apiCodes);
  }
}
