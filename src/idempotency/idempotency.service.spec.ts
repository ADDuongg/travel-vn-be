import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException } from '@nestjs/common';

import { IdempotencyService } from './idempotency.service';
import { Idempotency, IdempotencyStatus } from './schema/idempotency.schema';

/* ────────── mocks ────────── */
const mockIdempotencyModel = {
  findOne: jest.fn(),
  create: jest.fn(),
  updateOne: jest.fn(),
};

describe('IdempotencyService', () => {
  let service: IdempotencyService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyService,
        {
          provide: getModelToken(Idempotency.name),
          useValue: mockIdempotencyModel,
        },
      ],
    }).compile();

    service = module.get<IdempotencyService>(IdempotencyService);
  });

  /* ═══════════════════════════════════════════════
     execute
  ═══════════════════════════════════════════════ */
  describe('execute', () => {
    const key = 'idem-key-001';
    const userId = 'user-001';
    const endpoint = '/bookings';

    it('returns cached response when key already COMPLETED (does not call handler)', async () => {
      const cachedResponse = { bookingId: 'bk_123', status: 'CONFIRMED' };
      mockIdempotencyModel.findOne.mockResolvedValue({
        status: IdempotencyStatus.COMPLETED,
        response: cachedResponse,
      });

      const handler = jest.fn();
      const result = await service.execute(key, userId, endpoint, handler);

      expect(result).toEqual(cachedResponse);
      expect(handler).not.toHaveBeenCalled();
    });

    it('throws ConflictException when request is still PROCESSING', async () => {
      mockIdempotencyModel.findOne.mockResolvedValue({
        status: IdempotencyStatus.PROCESSING,
      });

      const handler = jest.fn();

      await expect(
        service.execute(key, userId, endpoint, handler),
      ).rejects.toThrow(ConflictException);
      expect(handler).not.toHaveBeenCalled();
    });

    it('creates record, calls handler, updates to COMPLETED, and returns handler result', async () => {
      mockIdempotencyModel.findOne.mockResolvedValue(null);
      mockIdempotencyModel.create.mockResolvedValue({});
      mockIdempotencyModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const handlerResult = { bookingId: 'bk_new', status: 'PENDING' };
      const handler = jest.fn().mockResolvedValue(handlerResult);

      const result = await service.execute(key, userId, endpoint, handler);

      expect(result).toEqual(handlerResult);
      expect(mockIdempotencyModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          key,
          userId,
          endpoint,
          status: 'PROCESSING',
          expireAt: expect.any(Date),
        }),
      );
      expect(mockIdempotencyModel.updateOne).toHaveBeenCalledWith(
        { key, userId },
        expect.objectContaining({
          status: 'COMPLETED',
          response: handlerResult,
          expireAt: expect.any(Date),
        }),
      );
    });

    it('creates separate records for different keys (not conflicting)', async () => {
      // First key: no existing record
      mockIdempotencyModel.findOne.mockResolvedValue(null);
      mockIdempotencyModel.create.mockResolvedValue({});
      mockIdempotencyModel.updateOne.mockResolvedValue({});

      const result1 = await service.execute('key-A', userId, endpoint, () =>
        Promise.resolve('result-A'),
      );
      const result2 = await service.execute('key-B', userId, endpoint, () =>
        Promise.resolve('result-B'),
      );

      expect(result1).toBe('result-A');
      expect(result2).toBe('result-B');
      expect(mockIdempotencyModel.create).toHaveBeenCalledTimes(2);
    });

    it('does not swallow handler errors (bubbles up)', async () => {
      mockIdempotencyModel.findOne.mockResolvedValue(null);
      mockIdempotencyModel.create.mockResolvedValue({});

      const handler = jest
        .fn()
        .mockRejectedValue(new Error('downstream failure'));

      await expect(
        service.execute(key, userId, endpoint, handler),
      ).rejects.toThrow('downstream failure');
      // updateOne should NOT have been called since handler threw
      expect(mockIdempotencyModel.updateOne).not.toHaveBeenCalled();
    });
  });
});
