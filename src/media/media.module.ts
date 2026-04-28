import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaAdminController } from './media.admin.controller';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [CloudinaryModule],
  controllers: [MediaAdminController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
