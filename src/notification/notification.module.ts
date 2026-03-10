import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { Notification, NotificationSchema } from './schema/notification.schema';
import { User, UserSchema } from 'src/user/schema/user.schema';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationListener } from './notification.listener';
import { NotificationProcessor } from './notification.processor';
import { EmailService } from './email/email.service';
import { NOTIFICATION_QUEUE } from './notification.constants';
import { EnvModule } from 'src/env/env.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: User.name, schema: UserSchema },
    ]),
    BullModule.registerQueue({ name: NOTIFICATION_QUEUE }),
    EnvModule,
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationListener,
    NotificationProcessor,
    EmailService,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
