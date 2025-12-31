import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { RouterRoleService } from './router-role.service';
import { CreateRouterRoleDto } from './dto/create-router-role.dto';

@Controller('/api/v1/router-roles')
export class RouterRoleController {
  constructor(private readonly routerRoleService: RouterRoleService) {}

  /**
   * Gán 1 router cho role
   */
  @Post()
  create(@Body() dto: CreateRouterRoleDto) {
    return this.routerRoleService.create(dto);
  }

  /**
   * Lấy toàn bộ mapping
   */
  @Get()
  findAll() {
    return this.routerRoleService.findAll();
  }

  /**
   * Lấy router theo role
   */
  @Get('role/:roleCode')
  findByRole(@Param('roleCode') roleCode: string) {
    return this.routerRoleService.findByRole(roleCode);
  }

  /**
   * Xoá 1 router khỏi role
   */
  @Delete(':roleCode/:routerCode')
  remove(
    @Param('roleCode') roleCode: string,
    @Param('routerCode') routerCode: string,
  ) {
    return this.routerRoleService.remove(roleCode, routerCode);
  }

  /**
   * Replace router list của role
   * Dùng cho checkbox UI
   */
  @Post('replace')
  replace(
    // @Param('roleCode') roleCode: string,
    @Body('routerCodes') routerCodes: string[],
    @Body('roleCode') roleCode: string,
  ) {
    return this.routerRoleService.replaceByRole(roleCode, routerCodes);
  }
}
