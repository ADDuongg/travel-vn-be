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
import { CreateBlogCategoryDto } from './dto/create-blog-category.dto';
import { BlogCategoryQueryDto } from './dto/blog-category-query.dto';
import { UpdateBlogCategoryDto } from './dto/update-blog-category.dto';
import { BlogCategoryService } from './blog-category.service';

@ApiBearerAuth()
@ApiTags('Admin · Blog categories')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionGuard)
@Controller('admin/blog-categories')
export class BlogCategoryAdminController {
  constructor(private readonly blogCategoryService: BlogCategoryService) {}

  @Get()
  @RequirePermissions('blog.view')
  @ApiCode('blog-category.admin.list')
  findAllAdmin(@Query() query: BlogCategoryQueryDto) {
    return this.blogCategoryService.findAll(query, { admin: true });
  }

  @Post()
  @RequirePermissions('blog.create')
  @ApiCode('blog-category.admin.create')
  create(@Body() dto: CreateBlogCategoryDto) {
    return this.blogCategoryService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('blog.update')
  @ApiCode('blog-category.admin.update')
  update(@Param('id') id: string, @Body() dto: UpdateBlogCategoryDto) {
    return this.blogCategoryService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('blog.delete')
  @ApiCode('blog-category.admin.delete')
  softDelete(@Param('id') id: string) {
    return this.blogCategoryService.softDelete(id);
  }
}
