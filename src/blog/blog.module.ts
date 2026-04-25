import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { BlogPost, BlogPostSchema } from './schema/blog-post.schema';
import { Province, ProvinceSchema } from 'src/provinces/schema/province.schema';
import { Tour, TourSchema } from 'src/tour/schema/tour.schema';
import { Hotel, HotelSchema } from 'src/hotel/schema/hotel.schema';
import { Language, LanguageSchema } from 'src/language/schema/language.schema';
import { User, UserSchema } from 'src/user/schema/user.schema';
import { BlogCategoryModule } from 'src/blog-category/blog-category.module';
import { BlogTagModule } from 'src/blog-tag/blog-tag.module';

@Module({
  imports: [
    BlogCategoryModule,
    BlogTagModule,
    MongooseModule.forFeature([
      { name: BlogPost.name, schema: BlogPostSchema },
      { name: User.name, schema: UserSchema },
      { name: Province.name, schema: ProvinceSchema },
      { name: Tour.name, schema: TourSchema },
      { name: Hotel.name, schema: HotelSchema },
      { name: Language.name, schema: LanguageSchema },
    ]),
  ],
  controllers: [BlogController],
  providers: [BlogService],
  exports: [BlogService],
})
export class BlogModule {}
