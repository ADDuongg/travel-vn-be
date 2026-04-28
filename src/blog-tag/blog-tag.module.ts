import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BlogTagAdminController } from './blog-tag.admin.controller';
import { BlogTagPublicController } from './blog-tag.public.controller';
import { BlogTagService } from './blog-tag.service';
import { BlogTag, BlogTagSchema } from './schema/blog-tag.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: BlogTag.name, schema: BlogTagSchema }]),
  ],
  controllers: [BlogTagPublicController, BlogTagAdminController],
  providers: [BlogTagService],
  exports: [BlogTagService],
})
export class BlogTagModule {}
