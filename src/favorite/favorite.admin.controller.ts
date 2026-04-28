import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiCode } from 'src/common/decorators/api-code.decorator';
import { RequirePermissions } from 'src/common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { PermissionGuard } from 'src/guards/permission.guard';
import { AdminFavoritesQueryDto } from './dto/admin-favorites-query.dto';
import { FavoriteService } from './favorite.service';

@ApiBearerAuth()
@ApiTags('Admin · Favorites')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionGuard)
@Controller('admin/favorites')
export class FavoriteAdminController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Get()
  @RequirePermissions('favorite.view')
  @ApiCode('favorite.admin.list')
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
