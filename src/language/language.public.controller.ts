import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LanguageService } from './language.service';

@ApiTags('Public · Languages')
@Controller('public/languages')
export class LanguagePublicController {
  constructor(private readonly service: LanguageService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
