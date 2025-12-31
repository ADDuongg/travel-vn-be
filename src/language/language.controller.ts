import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { LanguageService } from './language.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';

@Controller('/api/v1/languages')
export class LanguageController {
  constructor(
    private readonly service: LanguageService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  create(@Body() dto: CreateLanguageDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Put(':code')
  update(@Param('code') code: string, @Body() dto: UpdateLanguageDto) {
    delete (dto as any).code;
    return this.service.update(code, dto);
  }

  @Delete(':code')
  remove(@Param('code') code: string) {
    return this.service.remove(code);
  }

  // ===== OPTIONAL: upload flag qua BE =====
  @Post('upload-flag')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFlag(@UploadedFile() file: Express.Multer.File) {
    console.log('Uploaded file:', file);
    const res = await this.cloudinaryService.uploadFile(file);
    return {
      status: true,
      data: {
        url: res.secure_url,
        publicId: res.public_id,
      },
    };
  }
  /* upload multiple files */
  @Post('upload-flags')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadFlags(@UploadedFiles() files: Express.Multer.File[]) {
    const results = await this.cloudinaryService.uploadFiles(files);

    return {
      status: true,
      data: results.map((r) => ({
        url: r.secure_url,
        publicId: r.public_id,
      })),
    };
  }
}
