import { PartialType } from '@nestjs/swagger';
import { ProvinceContentDto } from './province-content.dto';

/**
 * Toàn bộ field optional (partial update) — cùng shape với `ProvinceContentDto`.
 */
export class UpdateProvinceDto extends PartialType(ProvinceContentDto) {}
