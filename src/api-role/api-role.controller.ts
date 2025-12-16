import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiRoleService } from './api-role.service';
import { CreateApiRoleDto } from './dto/create-api-role.dto';

@Controller('/api/v1/api-roles')
export class ApiRoleController {
  constructor(private readonly apiRoleService: ApiRoleService) {}

  /**
   * Gán 1 API cho role
   */
  @Post()
  create(@Body() dto: CreateApiRoleDto) {
    return this.apiRoleService.create(dto.roleCode, dto.apiCode);
  }

  /**
   * Lấy toàn bộ mapping
   */
  @Get()
  findAll() {
    return this.apiRoleService.findAll();
  }

  /**
   * Lấy API theo role
   */
  @Get('role/:roleCode')
  findByRole(@Param('roleCode') roleCode: string) {
    return this.apiRoleService.findByRole(roleCode);
  }

  /**
   * Xoá 1 API khỏi role
   */
  @Delete(':roleCode/:apiCode')
  remove(
    @Param('roleCode') roleCode: string,
    @Param('apiCode') apiCode: string,
  ) {
    return this.apiRoleService.remove(roleCode, apiCode);
  }

  /**
   * Replace API list của role
   * (dùng cho UI checkbox)
   */
  @Post('replace/:roleCode')
  replace(
    @Param('roleCode') roleCode: string,
    @Body('apiCodes') apiCodes: string[],
  ) {
    return this.apiRoleService.replaceByRole(roleCode, apiCodes);
  }
}
