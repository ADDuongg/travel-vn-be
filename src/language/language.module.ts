import { Module } from '@nestjs/common';
import { LanguageService } from './language.service';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { LanguageAdminController } from './language.admin.controller';
import { LanguagePublicController } from './language.public.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Language, LanguageSchema } from './schema/language.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Language.name, schema: LanguageSchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [LanguagePublicController, LanguageAdminController],
  providers: [LanguageService],
  exports: [LanguageService],
})
export class LanguageModule {}
