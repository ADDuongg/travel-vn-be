import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { ApiCode } from 'src/common/decorators/api-code.decorator';
import { RequirePermissions } from 'src/common/decorators/require-permissions.decorator';
import { AdminGuard } from 'src/guards/admin.guard';
import { PermissionGuard } from 'src/guards/permission.guard';
import { BlogService } from './blog.service';
import { BlogPostAdminQueryDto } from './dto/blog-post-admin-query.dto';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';

@ApiBearerAuth()
@ApiTags('Admin · Blogs')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionGuard)
@Controller('admin/blogs')
export class BlogAdminController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  @RequirePermissions('blog.view')
  @ApiCode('blog.admin.list')
  findAllAdmin(@Query() query: BlogPostAdminQueryDto) {
    return this.blogService.findAllAdmin(query);
  }

  @Get(':id')
  @RequirePermissions('blog.view')
  @ApiCode('blog.admin.get')
  findOneAdmin(@Param('id') id: string) {
    return this.blogService.findOneAdminById(id);
  }

  @Post()
  @RequirePermissions('blog.create')
  @ApiCode('blog.admin.create')
  create(
    @Body() dto: CreateBlogPostDto,
    @Req() req: { user: { userId: string } },
  ) {
    return this.blogService.create(req.user.userId, dto);
  }

  @Patch(':id')
  @RequirePermissions('blog.update')
  @ApiCode('blog.admin.update')
  update(@Param('id') id: string, @Body() dto: UpdateBlogPostDto) {
    return this.blogService.update(id, dto);
  }

  @Patch(':id/publish')
  @RequirePermissions('blog.publish')
  @ApiCode('blog.admin.publish')
  publish(@Param('id') id: string) {
    return this.blogService.publish(id);
  }

  @Patch(':id/unpublish')
  @RequirePermissions('blog.publish')
  @ApiCode('blog.admin.unpublish')
  unpublish(@Param('id') id: string) {
    return this.blogService.unpublish(id);
  }

  @Delete(':id')
  @RequirePermissions('blog.delete')
  @ApiCode('blog.admin.delete')
  remove(@Param('id') id: string) {
    return this.blogService.softDelete(id);
  }
}
