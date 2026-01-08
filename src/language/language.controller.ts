import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LanguageService } from './language.service';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';

@Controller('/api/v1/languages')
export class LanguageController {
  constructor(private readonly service: LanguageService) {}

  @Post()
  @UseInterceptors(FileInterceptor('flag'))
  create(
    @Body() dto: CreateLanguageDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.create(dto, file);
  }

  @Put(':code')
  @UseInterceptors(FileInterceptor('flag'))
  update(
    @Param('code') code: string,
    @Body() dto: UpdateLanguageDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.update(code, dto, file);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Delete(':code')
  remove(@Param('code') code: string) {
    return this.service.remove(code);
  }
}
