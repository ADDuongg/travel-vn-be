import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMongoId } from 'class-validator';
import { FavoriteEntityType } from '../favorite.types';

export class ToggleFavoriteDto {
  @ApiProperty({ enum: FavoriteEntityType })
  @IsEnum(FavoriteEntityType)
  entityType: FavoriteEntityType;

  @ApiProperty()
  @IsMongoId()
  entityId: string;
}
