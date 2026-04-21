import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { Roles, RolesGuard } from 'src/guards/role.guard';
import { AdminFavoritesQueryDto } from './dto/admin-favorites-query.dto';
import { FavoriteService } from './favorite.service';

@ApiTags('favorites-admin')
@Controller('/api/v1/favorites/admin')
export class FavoriteAdminController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  @Get()
  findAll(@Query() query: AdminFavoritesQueryDto) {
    return this.favoriteService.adminFindAll({
      userId: query.userId,
      entityType: query.entityType,
      entityId: query.entityId,
      page: query.page,
      limit: query.limit,
    });
  }
}

