import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BlogTagController } from './blog-tag.controller';
import { BlogTagService } from './blog-tag.service';
import { BlogTag, BlogTagSchema } from './schema/blog-tag.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: BlogTag.name, schema: BlogTagSchema }]),
  ],
  controllers: [BlogTagController],
  providers: [BlogTagService],
  exports: [BlogTagService],
})
export class BlogTagModule {}
