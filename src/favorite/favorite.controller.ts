import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { FavoriteService } from './favorite.service';
import { ToggleFavoriteDto } from './dto/toggle-favorite.dto';
import { MyFavoritesQueryDto } from './dto/my-favorites-query.dto';
import { IsFavoritedQueryDto } from './dto/is-favorited-query.dto';

@ApiTags('favorites')
@Controller('/api/v1/favorites')
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @UseGuards(JwtAuthGuard)
  @Post('toggle')
  toggle(@Body() dto: ToggleFavoriteDto, @Req() req: { user?: { userId: string } }) {
    return this.favoriteService.toggleFavorite({
      userId: req.user?.userId,
      entityType: dto.entityType,
      entityId: dto.entityId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/list')
  myList(
    @Req() req: { user?: { userId: string } },
    @Query() query: MyFavoritesQueryDto,
  ) {
    return this.favoriteService.findMyFavoritesList({
      userId: req.user?.userId,
      entityType: query.entityType,
      page: query.page,
      limit: query.limit,
      lang: query.lang,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/is-favorited')
  isFavorited(
    @Req() req: { user?: { userId: string } },
    @Query() query: IsFavoritedQueryDto,
  ) {
    return this.favoriteService.isFavorited({
      userId: req.user?.userId,
      entityType: query.entityType,
      entityId: query.entityId,
    });
  }
}

