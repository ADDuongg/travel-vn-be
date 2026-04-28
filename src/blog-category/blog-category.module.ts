import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BlogCategoryAdminController } from './blog-category.admin.controller';
import { BlogCategoryPublicController } from './blog-category.public.controller';
import { BlogCategoryService } from './blog-category.service';
import {
  BlogCategory,
  BlogCategorySchema,
} from './schema/blog-category.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BlogCategory.name, schema: BlogCategorySchema },
    ]),
  ],
  controllers: [BlogCategoryPublicController, BlogCategoryAdminController],
  providers: [BlogCategoryService],
  exports: [BlogCategoryService],
})
export class BlogCategoryModule {}
