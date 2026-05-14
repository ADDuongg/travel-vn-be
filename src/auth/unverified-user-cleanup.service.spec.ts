import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UnverifiedUserCleanupService } from './unverified-user-cleanup.service';
import { User } from 'src/user/schema/user.schema';
import { EnvService } from 'src/env/env.service';
import { AuditLogService } from 'src/audit-log/audit-log.service';

describe('UnverifiedUserCleanupService', () => {
  let service: UnverifiedUserCleanupService;
  const updateMany = jest.fn().mockResolvedValue({ modifiedCount: 0 });

  const mockEnv = {
    get: jest.fn((k: string, def?: number) =>
      k === 'UNVERIFIED_USER_TTL_DAYS' ? 7 : def,
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    updateMany.mockResolvedValue({ modifiedCount: 0 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnverifiedUserCleanupService,
        { provide: getModelToken(User.name), useValue: { updateMany } },
        { provide: EnvService, useValue: mockEnv },
        {
          provide: AuditLogService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get(UnverifiedUserCleanupService);
  });

  it('runs updateMany with expected filter shape', async () => {
    await service.purgeStaleUnverifiedUsers();

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        isEmailVerified: false,
        isSuperAdmin: { $ne: true },
        deletedAt: { $exists: false },
        createdAt: expect.any(Object),
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          deletedAt: expect.any(Date),
          isActive: false,
        }),
      }),
    );
  });
});
