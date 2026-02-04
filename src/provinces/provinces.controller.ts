import { Controller, Get } from '@nestjs/common';
import { ProvincesService } from './provinces.service';

@Controller('/api/v1/provinces')
export class ProvincesController {
  constructor(private readonly provincesService: ProvincesService) {}

  @Get()
  findAll() {
    return this.provincesService.findAll();
  }
}
