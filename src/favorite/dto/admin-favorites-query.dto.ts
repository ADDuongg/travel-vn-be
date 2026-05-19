import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsMongoId, IsOptional, Min } from 'class-validator';
import { FavoriteEntityType } from '../favorite.types';

export class AdminFavoritesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @ApiPropertyOptional({ enum: FavoriteEntityType })
  @IsOptional()
  @IsEnum(FavoriteEntityType)
  entityType?: FavoriteEntityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  entityId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
