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
import { RequirePermissions } from 'src/common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { PermissionGuard } from 'src/guards/permission.guard';
import { MediaService } from './media.service';

@ApiBearerAuth()
@ApiTags('Admin · Media')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionGuard)
@Controller('admin/media')
export class MediaAdminController {
  constructor(private readonly mediaService: MediaService) {}

  @ApiCode('media.admin.upload')
  @Post('upload')
  @RequirePermissions('media.upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: Express.Multer.File) {
    return this.mediaService.uploadFile(file);
  }

  @ApiCode('media.admin.uploadMultiple')
  @Post('upload-multiple')
  @RequirePermissions('media.upload')
  @UseInterceptors(FilesInterceptor('files'))
  uploadMultiple(@UploadedFiles() files: Express.Multer.File[]) {
    return this.mediaService.uploadFiles(files);
  }
}
