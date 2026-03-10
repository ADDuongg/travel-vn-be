import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NOTIFICATION_QUEUE, NotificationEvent } from './notification.constants';
import { GuideRegisteredEvent } from './events/guide-registered.event';
import { GuideVerifiedEvent } from './events/guide-verified.event';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    @InjectQueue(NOTIFICATION_QUEUE) private readonly notificationQueue: Queue,
  ) {}

  @OnEvent(NotificationEvent.GUIDE_REGISTERED)
  async onGuideRegistered(event: GuideRegisteredEvent) {
    this.logger.log(`Guide registered event: ${event.guideId}`);
    await this.notificationQueue.add(
      'guide-registered',
      {
        guideId: event.guideId,
        userId: event.userId,
        userName: event.userName,
        userEmail: event.userEmail,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
  }

  @OnEvent(NotificationEvent.GUIDE_VERIFIED)
  async onGuideVerified(event: GuideVerifiedEvent) {
    this.logger.log(`Guide verified event: ${event.guideId}, verified=${event.isVerified}`);
    await this.notificationQueue.add(
      'guide-verified',
      {
        guideId: event.guideId,
        userId: event.userId,
        userName: event.userName,
        userEmail: event.userEmail,
        isVerified: event.isVerified,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
  }
}
