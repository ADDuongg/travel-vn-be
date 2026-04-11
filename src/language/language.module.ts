import { Module } from '@nestjs/common';
import { LanguageService } from './language.service';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { LanguageController } from './language.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Language, LanguageSchema } from './schema/language.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Language.name, schema: LanguageSchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [LanguageController],
  providers: [LanguageService],
  exports: [LanguageService],
})
export class LanguageModule {}
