import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoomQueryDto } from './dto/room-query.dto';
import { RoomService } from './room.service';
import { JwtOptionalAuthGuard } from 'src/guards/jwt-optional-auth.guard';

@ApiTags('Public · Rooms')
@Controller('public/rooms')
export class RoomPublicController {
  constructor(private readonly roomService: RoomService) {}

  @Get()
  @UseGuards(JwtOptionalAuthGuard)
  findAll(
    @Query() query: RoomQueryDto,
    @Req() req: { user?: { userId: string } },
  ) {
    return this.roomService.findAll(query, req.user?.userId);
  }

  @Get(':id')
  @UseGuards(JwtOptionalAuthGuard)
  findOne(@Param('id') id: string, @Req() req: { user?: { userId: string } }) {
    return this.roomService.findOne(id, req.user?.userId);
  }
}
