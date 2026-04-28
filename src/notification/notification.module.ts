import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { Notification, NotificationSchema } from './schema/notification.schema';
import { User, UserSchema } from 'src/user/schema/user.schema';
import { NotificationClientController } from './notification.client.controller';
import { NotificationService } from './notification.service';
import { NotificationListener } from './notification.listener';
import { NotificationProcessor } from './notification.processor';
import { NOTIFICATION_QUEUE } from './notification.constants';
import { EnvModule } from 'src/env/env.module';
import { MailModule } from 'src/mail/mail.module';
import { IdempotencyModule } from 'src/idempotency/idempotency.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: User.name, schema: UserSchema },
    ]),
    BullModule.registerQueue({ name: NOTIFICATION_QUEUE }),
    EnvModule,
    MailModule,
    IdempotencyModule,
  ],
  controllers: [NotificationClientController],
  providers: [NotificationService, NotificationListener, NotificationProcessor],
  exports: [NotificationService],
})
export class NotificationModule {}
