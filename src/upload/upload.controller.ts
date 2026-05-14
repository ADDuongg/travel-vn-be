import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { EmailVerifiedGuard } from 'src/guards/email-verified.guard';

@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, EmailVerifiedGuard)
@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return {
      filename: file.filename,
      path: file.path,
      originalname: file.originalname,
      size: file.size,
    };
  }
}
