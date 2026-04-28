import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BlogTagQueryDto } from './dto/blog-tag-query.dto';
import { BlogTagService } from './blog-tag.service';

@ApiTags('Public · Blog tags')
@Controller('public/blog-tags')
export class BlogTagPublicController {
  constructor(private readonly blogTagService: BlogTagService) {}

  @Get()
  findAll(@Query() query: BlogTagQueryDto) {
    return this.blogTagService.findAllPublic(query);
  }
}
