import { getQueueToken } from '@nestjs/bullmq';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { createDomainEventEnvelope } from 'src/common/events/domain-event';
import { EnvService } from 'src/env/env.service';
import { User } from 'src/user/schema/user.schema';
import {
  NotificationEvent,
  NOTIFICATION_QUEUE,
} from './notification.constants';
import { NotificationListener } from './notification.listener';

describe('NotificationListener', () => {
  it('enqueues OTP job with requestId and deterministic jobId', async () => {
    const add = jest.fn().mockResolvedValue(undefined);
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationListener,
        {
          provide: getQueueToken(NOTIFICATION_QUEUE),
          useValue: { add },
        },
        {
          provide: getModelToken(User.name),
          useValue: { find: jest.fn() },
        },
        {
          provide: EnvService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    const listener = moduleRef.get(NotificationListener);
    await listener.onOtpIssued(
      createDomainEventEnvelope({
        eventName: String(NotificationEvent.OTP_ISSUED),
        source: 'OtpService',
        requestId: 'req-otp-1',
        eventId: 'evt-otp-1',
        occurredAt: '2026-05-05T09:00:00.000Z',
        payload: {
          purpose: 'VERIFY_EMAIL',
          target: 'a@example.com',
          code: '123456',
          expiresAt: '2026-05-05T09:05:00.000Z',
        },
      }),
    );

    const [jobName, jobData, jobOpts] = add.mock.calls[0];
    expect(jobName).toBe('auth-otp-issued');
    expect(jobData.requestId).toBe('req-otp-1');
    expect(jobData.eventId).toBe('evt-otp-1');
    expect(jobData.payload.target).toBe('a@example.com');
    expect(jobOpts.jobId).toBe(
      'auth-otp-issued:a@example.com:VERIFY_EMAIL:evt-otp-1',
    );
  });
});
