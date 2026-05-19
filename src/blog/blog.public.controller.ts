import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtOptionalAuthGuard } from 'src/guards/jwt-optional-auth.guard';
import { BlogService } from './blog.service';
import { BlogPostQueryDto } from './dto/blog-post-query.dto';

@ApiTags('Public · Blogs')
@Controller('public/blogs')
export class BlogPublicController {
  constructor(private readonly blogService: BlogService) {}

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

  @Get(':slug/related')
  findRelated(@Param('slug') slug: string) {
    return this.blogService.findRelatedBySlug(slug);
  }

  @Get(':slug')
  @UseGuards(JwtOptionalAuthGuard)
  @ApiBearerAuth()
  findOneBySlug(@Param('slug') slug: string) {
    return this.blogService.findBySlugPublic(slug);
  }
}
