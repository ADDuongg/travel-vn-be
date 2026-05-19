import { PartialType } from '@nestjs/swagger';
import { ProvinceContentDto } from './province-content.dto';

export class UpdateProvinceDto extends PartialType(ProvinceContentDto) {}
