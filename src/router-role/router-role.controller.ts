import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { RouterRoleService } from './router-role.service';
import { CreateRouterRoleDto } from './dto/create-router-role.dto';

@Controller('router-roles')
export class RouterRoleController {
  constructor(private readonly routerRoleService: RouterRoleService) {}

  @Post()
  create(@Body() dto: CreateRouterRoleDto) {
    return this.routerRoleService.create(dto);
  }

  @Get()
  findAll() {
    return this.routerRoleService.findAll();
  }

  @Get('role/:roleCode')
  findByRole(@Param('roleCode') roleCode: string) {
    return this.routerRoleService.findByRole(roleCode);
  }

  @Delete(':roleCode/:routerCode')
  remove(
    @Param('roleCode') roleCode: string,
    @Param('routerCode') routerCode: string,
  ) {
    return this.routerRoleService.remove(roleCode, routerCode);
  }

  @Post('replace')
  replace(
    @Body('routerCodes') routerCodes: string[],
    @Body('roleCode') roleCode: string,
  ) {
    return this.routerRoleService.replaceByRole(roleCode, routerCodes);
  }
}
