import {
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiCode } from 'src/common/decorators/api-code.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { MediaService } from './media.service';

@ApiBearerAuth()
@ApiTags('Client · Media')
@UseGuards(JwtAuthGuard)
@Controller('client/media')
export class MediaClientController {
  constructor(private readonly mediaService: MediaService) {}

  @ApiCode('media.client.upload')
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: Express.Multer.File) {
    return this.mediaService.uploadFile(file);
  }

  @ApiCode('media.client.uploadMultiple')
  @Post('upload-multiple')
  @UseInterceptors(FilesInterceptor('files'))
  uploadMultiple(@UploadedFiles() files: Express.Multer.File[]) {
    return this.mediaService.uploadFiles(files);
  }
}
