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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiCode } from 'src/common/decorators/api-code.decorator';
import { RequirePermissions } from 'src/common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { PermissionGuard } from 'src/guards/permission.guard';
import { CreateBlogTagDto } from './dto/create-blog-tag.dto';
import { BlogTagQueryDto } from './dto/blog-tag-query.dto';
import { UpdateBlogTagDto } from './dto/update-blog-tag.dto';
import { BlogTagService } from './blog-tag.service';

@ApiBearerAuth()
@ApiTags('Admin · Blog tags')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionGuard)
@Controller('admin/blog-tags')
export class BlogTagAdminController {
  constructor(private readonly blogTagService: BlogTagService) {}

  @Get()
  @RequirePermissions('blog.view')
  @ApiCode('blog-tag.admin.list')
  findAllAdmin(@Query() query: BlogTagQueryDto) {
    return this.blogTagService.findAll(query, { admin: true });
  }

  @Post()
  @RequirePermissions('blog.create')
  @ApiCode('blog-tag.admin.create')
  create(@Body() dto: CreateBlogTagDto) {
    return this.blogTagService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('blog.update')
  @ApiCode('blog-tag.admin.update')
  update(@Param('id') id: string, @Body() dto: UpdateBlogTagDto) {
    return this.blogTagService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('blog.delete')
  @ApiCode('blog-tag.admin.delete')
  softDelete(@Param('id') id: string) {
    return this.blogTagService.softDelete(id);
  }
}
