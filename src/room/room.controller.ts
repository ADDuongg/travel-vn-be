import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';

import { CreateRoomDto } from './dto/create-room.dto';
import { RoomQueryDto } from './dto/room-query.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomService } from './room.service';
import { JwtOptionalAuthGuard } from 'src/guards/jwt-optional-auth.guard';

@Controller('/api/v1/rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('gallery', 10))
  create(
    @Body() createRoomDto: CreateRoomDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.roomService.create(createRoomDto, files);
  }

  @Get()
  @UseGuards(JwtOptionalAuthGuard)
  findAll(@Query() query: RoomQueryDto, @Req() req: { user?: { userId: string } }) {
    return this.roomService.findAll(query, req.user?.userId);
  }

  @Get(':id')
  @UseGuards(JwtOptionalAuthGuard)
  findOne(@Param('id') id: string, @Req() req: { user?: { userId: string } }) {
    return this.roomService.findOne(id, req.user?.userId);
  }

  @Patch(':id')
  @UseInterceptors(FilesInterceptor('gallery', 10))
  update(
    @Param('id') id: string,
    @Body() updateRoomDto: UpdateRoomDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.roomService.update(id, updateRoomDto, files);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roomService.remove(id);
  }
}
