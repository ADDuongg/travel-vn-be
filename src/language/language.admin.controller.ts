import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiCode } from 'src/common/decorators/api-code.decorator';
import { RequirePermissions } from 'src/common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { PermissionGuard } from 'src/guards/permission.guard';
import { LanguageService } from './language.service';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';

@ApiBearerAuth()
@ApiTags('Admin · Languages')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionGuard)
@Controller('admin/languages')
export class LanguageAdminController {
  constructor(private readonly service: LanguageService) {}

  @Post()
  @RequirePermissions('language.create')
  @ApiCode('language.admin.create')
  @UseInterceptors(FileInterceptor('flag'))
  create(
    @Body() dto: CreateLanguageDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.create(dto, file);
  }

  @Put(':code')
  @RequirePermissions('language.update')
  @ApiCode('language.admin.update')
  @UseInterceptors(FileInterceptor('flag'))
  update(
    @Param('code') code: string,
    @Body() dto: UpdateLanguageDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.update(code, dto, file);
  }

  @Delete(':code')
  @RequirePermissions('language.delete')
  @ApiCode('language.admin.delete')
  remove(@Param('code') code: string) {
    return this.service.remove(code);
  }
}
