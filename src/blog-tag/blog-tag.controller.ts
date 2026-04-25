import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { Roles, RolesGuard } from 'src/guards/role.guard';
import { BlogTagService } from './blog-tag.service';
import { CreateBlogTagDto } from './dto/create-blog-tag.dto';
import { UpdateBlogTagDto } from './dto/update-blog-tag.dto';
import { BlogTagQueryDto } from './dto/blog-tag-query.dto';

@Controller('/api/v1/blog-tags')
export class BlogTagController {
  constructor(private readonly blogTagService: BlogTagService) {}

  @Get()
  findAll(@Query() query: BlogTagQueryDto) {
    return this.blogTagService.findAllPublic(query);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  create(@Body() dto: CreateBlogTagDto) {
    return this.blogTagService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  update(@Param('id') id: string, @Body() dto: UpdateBlogTagDto) {
    return this.blogTagService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  softDelete(@Param('id') id: string) {
    return this.blogTagService.softDelete(id);
  }
}
