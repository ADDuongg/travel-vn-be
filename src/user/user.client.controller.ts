import { Body, Controller, Patch, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { DomainException, NotFoundDomainException, ForbiddenDomainException } from 'src/common/exceptions';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CrudAuditInterceptor } from 'src/audit-log/interceptors/crud-audit.interceptor';

import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';

@ApiBearerAuth()
@ApiTags('Client · Users')
@UseGuards(JwtAuthGuard)
@UseInterceptors(CrudAuditInterceptor)
@Controller('client/users')
export class UserClientController {
  constructor(private readonly userService: UserService) {}

  @Patch('profile/me')
  @UseInterceptors(FileInterceptor('avatar'))
  updateProfile(
    @Req() req: { user?: { userId: string } },
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new DomainException('Unauthorized', 401, 'UNAUTHORIZED', 'user.unauthorized');
    return this.userService.updateProfile(userId, updateUserDto, file);
  }
}
