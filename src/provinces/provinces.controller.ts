import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { Roles, RolesGuard } from 'src/guards/role.guard';
import { ProvincesService } from './provinces.service';
import { UpdateProvinceDto } from './dto/update-province.dto';
import { ProvinceQueryDto } from './dto/province-query.dto';

@Controller('/api/v1/provinces')
export class ProvincesController {
  constructor(private readonly provincesService: ProvincesService) {}

  /* ================= PUBLIC ================= */

  @Get()
  findAll(@Query() query: ProvinceQueryDto) {
    return this.provincesService.findAll(query);
  }

  @Get('popular')
  findPopular() {
    return this.provincesService.findPopular();
  }

  @Get('dropdown')
  findAllForDropdown() {
    return this.provincesService.findAllForDropdown();
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.provincesService.findBySlug(slug);
  }

  /* ================= ADMIN ================= */

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  @UseInterceptors(AnyFilesInterceptor())
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProvinceDto,
    @Req() req: { files?: Express.Multer.File[] },
  ) {
    return this.provincesService.update(id, dto, req.files ?? []);
  }

  @Patch(':id/toggle-popular')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  togglePopular(@Param('id') id: string) {
    return this.provincesService.togglePopular(id);
  }

  @Patch(':id/restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  restore(@Param('id') id: string) {
    return this.provincesService.restore(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  softDelete(@Param('id') id: string) {
    return this.provincesService.softDelete(id);
  }
}
