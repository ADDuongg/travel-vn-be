import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';
import { NotificationQueryDto } from './dto/notification-query.dto';

@Controller('api/v1/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  findAll(
    @Req() req: { user: { userId: string } },
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationService.findByRecipient(req.user.userId, query);
  }

  @Get('unread-count')
  getUnreadCount(@Req() req: { user: { userId: string } }) {
    console.log('req.user.userId', req.user.userId);

    return this.notificationService
      .getUnreadCount(req.user.userId)
      .then((count) => ({ count }));
  }

  @Patch(':id/read')
  markAsRead(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.notificationService.markAsRead(id, req.user.userId);
  }

  @Patch('read-all')
  markAllAsRead(@Req() req: { user: { userId: string } }) {
    return this.notificationService.markAllAsRead(req.user.userId);
  }
}
