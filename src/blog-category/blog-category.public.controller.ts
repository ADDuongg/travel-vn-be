import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BlogCategoryQueryDto } from './dto/blog-category-query.dto';
import { BlogCategoryService } from './blog-category.service';

@ApiTags('Public · Blog categories')
@Controller('public/blog-categories')
export class BlogCategoryPublicController {
  constructor(private readonly blogCategoryService: BlogCategoryService) {}

  @Get()
  findAll(@Query() query: BlogCategoryQueryDto) {
    return this.blogCategoryService.findAllPublic(query);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.blogCategoryService.findBySlug(slug);
  }
}
