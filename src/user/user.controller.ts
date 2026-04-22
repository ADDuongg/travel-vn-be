import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CrudAuditInterceptor } from 'src/audit-log/interceptors/crud-audit.interceptor';
import { AuditLog } from 'src/audit-log/decorators/audit-log.decorator';
import { AuditResourceType } from 'src/audit-log/enums/audit-log.enum';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';

@Controller('api/v1/users')
@UseInterceptors(CrudAuditInterceptor)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @AuditLog(AuditResourceType.USER)
  create(@Body() createUserDto: CreateUserDto) {
    try {
      const user = this.userService.create(createUserDto);
      return user;
    } catch {
      throw new ForbiddenException();
    }
  }

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile/me')
  @UseInterceptors(FileInterceptor('avatar'))
  updateProfile(
    @Req() req: { user?: { userId: string } },
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException('Unauthorized');
    return this.userService.updateProfile(userId, updateUserDto, file);
  }

  @Get(':id')
  findOneById(@Param('id') id: string) {
    return this.userService.findOneById(id);
  }

  @Patch(':id')
  @AuditLog(AuditResourceType.USER)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @AuditLog(AuditResourceType.USER)
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
