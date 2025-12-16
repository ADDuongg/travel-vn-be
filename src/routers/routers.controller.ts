import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateRouterDto } from './dto/create-router.dto';
import { UpdateRouterDto } from './dto/update-router.dto';
import { RouterService } from './routers.service';

@Controller('routers')
export class RouterController {
  constructor(private readonly routerService: RouterService) {}

  @Post()
  create(@Body() dto: CreateRouterDto) {
    return this.routerService.create(dto);
  }

  @Get()
  findAll() {
    return this.routerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.routerService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRouterDto) {
    return this.routerService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.routerService.remove(id);
  }
}
