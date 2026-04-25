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
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { Roles, RolesGuard } from 'src/guards/role.guard';
import { BlogService } from './blog.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { BlogPostQueryDto } from './dto/blog-post-query.dto';
import { BlogPostAdminQueryDto } from './dto/blog-post-admin-query.dto';

@Controller('api/v1/blog-posts')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  /* ------------------------- PUBLIC (FE client) ------------------------- */

  @Get()
  findAll(@Query() query: BlogPostQueryDto) {
    return this.blogService.findAllPublic(query);
  }

  @Get('featured')
  findFeatured(@Query('limit') limitStr?: string) {
    const n = limitStr != null ? parseInt(limitStr, 10) : 6;
    const limit = Number.isFinite(n) && n > 0 ? Math.min(50, n) : 6;
    return this.blogService.findFeatured(limit);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  findAllAdmin(@Query() query: BlogPostAdminQueryDto) {
    return this.blogService.findAllAdmin(query);
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  findOneAdmin(@Param('id') id: string) {
    return this.blogService.findOneAdminById(id);
  }

  @Get(':slug/related')
  findRelated(@Param('slug') slug: string) {
    return this.blogService.findRelatedBySlug(slug);
  }

  @Get(':slug')
  findOneBySlug(@Param('slug') slug: string) {
    return this.blogService.findBySlugPublic(slug);
  }

  /* ------------------------- ADMIN (mutations) ------------------------- */

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  create(
    @Body() dto: CreateBlogPostDto,
    @Req() req: { user: { userId: string } },
  ) {
    return this.blogService.create(req.user.userId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  update(@Param('id') id: string, @Body() dto: UpdateBlogPostDto) {
    return this.blogService.update(id, dto);
  }

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  publish(@Param('id') id: string) {
    return this.blogService.publish(id);
  }

  @Patch(':id/unpublish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  unpublish(@Param('id') id: string) {
    return this.blogService.unpublish(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  remove(@Param('id') id: string) {
    return this.blogService.softDelete(id);
  }
}
