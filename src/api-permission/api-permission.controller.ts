import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiPermissionService } from './api-permission.service';
import { CreateApiPermissionDto } from './dto/create-api-permission.dto';
import { UpdateApiPermissionDto } from './dto/update-api-permission.dto';

@Controller('/api/v1/api-permissions')
export class ApiPermissionController {
  constructor(private readonly apiPermissionService: ApiPermissionService) {}

  @Post()
  create(@Body() dto: CreateApiPermissionDto) {
    return this.apiPermissionService.create(dto);
  }

  @Get()
  findAll() {
    return this.apiPermissionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.apiPermissionService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateApiPermissionDto) {
    return this.apiPermissionService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.apiPermissionService.remove(id);
  }
}
