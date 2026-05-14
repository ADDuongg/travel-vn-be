import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { DomainException } from 'src/common/exceptions';
import { JwtService } from '@nestjs/jwt';
import { Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';

import { AuthService } from './auth.service';
import { RefreshToken } from './schema/refresh_token.schema';
import { User } from 'src/user/schema/user.schema';
import { UserService } from 'src/user/user.service';
import { EnvService } from 'src/env/env.service';
import { OtpService } from 'src/otp/otp.service';
import { AttemptLimiterService } from 'src/attempt-limiter/attempt-limiter.service';
import { PermissionService } from '../permission/permission.service';
import { RbacService } from 'src/rbac/rbac.service';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import { AuthAuditAction } from 'src/audit-log/enums/audit-log.enum';
import { AuthUser } from 'src/user/interfaces/user-interface';
import { OtpPurpose } from 'src/otp/otp.types';

/* ────────── helpers ────────── */
const userId = new Types.ObjectId('000000000000000000000001');

const mockUser = {
  _id: userId,
  username: 'testuser',
  password: 'hashed_pass',
  roles: ['user'],
  permissions: { apis: [], routers: [] },
  isActive: true,
  isEmailVerified: true,
};

const mockAuthUser: AuthUser = {
  _id: userId,
  username: mockUser.username,
  roles: mockUser.roles,
  permissions: { apis: [], routers: [] },
  isEmailVerified: true,
};

/* ────────── mocks ────────── */
const mockRefreshTokenModel = {
  findOne: jest.fn(),
  create: jest.fn(),
  updateOne: jest.fn(),
  updateMany: jest.fn(),
  decode: jest.fn(),
};

const mockUserModel = {
  findById: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({ isActive: true }),
    }),
  }),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  exists: jest.fn(),
};

const mockUsersService = {
  findOne: jest.fn(),
  findOneById: jest.fn(),
  create: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('signed_token'),
  verify: jest.fn(),
  decode: jest.fn(),
};

const mockEnvService = {
  isProduction: jest.fn().mockReturnValue(false),
  get: jest.fn((key: string, def?: string) => {
    const map: Record<string, string | number> = {
      JWT_SECRET: 'test_jwt_secret_minimum_16chars',
      JWT_REFRESH_SECRET: 'test_refresh_secret_min_16chars',
      JWT_REFRESH_TTL: '7d',
      JWT_ISSUER: 'test-app',
      JWT_AUDIENCE: 'test-clients',
      LOGIN_FAIL_MAX_ATTEMPTS: 5,
      LOGIN_FAIL_WINDOW_SEC: 900,
      LOGIN_FAIL_LOCKOUT_SEC: 900,
      UNVERIFIED_USER_TTL_DAYS: 7,
    };
    return (map[key] ?? def) as never;
  }),
};

const mockPermissionService = {
  resolvePermissions: jest.fn().mockResolvedValue({ apis: [], routers: [] }),
};

const mockRbacService = {
  resolveFlatPermissions: jest.fn().mockResolvedValue([]),
};

const mockOtpService = {
  issue: jest.fn().mockResolvedValue({}),
  verifyAndConsume: jest.fn().mockResolvedValue({}),
};

const mockAttemptLimiterService = {
  check: jest.fn().mockResolvedValue({
    locked: false,
    count: 0,
    remainingAttempts: 5,
    retryAfterSec: 0,
  }),
  hit: jest.fn().mockResolvedValue({
    locked: false,
    count: 1,
    remainingAttempts: 4,
    retryAfterSec: 0,
  }),
  reset: jest.fn().mockResolvedValue(undefined),
};

const mockAuditLogService = {
  log: jest.fn().mockResolvedValue(undefined),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockUserModel.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ isActive: true, deletedAt: null }),
      }),
    });
    mockUserModel.findOne.mockImplementation(() => ({
      select: () => ({
        lean: () => Promise.resolve(null),
      }),
    }));
    mockUserModel.exists.mockResolvedValue(null);
    mockUserModel.findOneAndUpdate.mockImplementation(() => ({
      select: () => ({
        lean: () =>
          Promise.resolve({
            _id: userId,
            username: 'testuser',
          }),
      }),
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(RefreshToken.name),
          useValue: mockRefreshTokenModel,
        },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: UserService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: EnvService, useValue: mockEnvService },
        { provide: PermissionService, useValue: mockPermissionService },
        { provide: RbacService, useValue: mockRbacService },
        { provide: OtpService, useValue: mockOtpService },
        { provide: AttemptLimiterService, useValue: mockAttemptLimiterService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  /* ═══════════════════════════════════════════════
     validateUser
  ═══════════════════════════════════════════════ */
  describe('validateUser', () => {
    it('returns AuthUser when username and password are correct', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.validateUser(
        'testuser',
        'plain_pass',
        undefined,
      );

      expect(result).toMatchObject({ username: 'testuser' });
      expect(mockPermissionService.resolvePermissions).toHaveBeenCalledWith(
        mockUser.roles,
      );
      expect(mockRbacService.resolveFlatPermissions).toHaveBeenCalledWith(
        mockUser.roles,
        false,
      );
    });

    it('returns null when user does not exist', async () => {
      mockUsersService.findOne.mockResolvedValue(null);

      const result = await service.validateUser(
        'unknown',
        'any',
        undefined,
      );

      expect(result).toBeNull();
    });

    it('throws DomainException when login limiter reports locked', async () => {
      mockAttemptLimiterService.check.mockResolvedValueOnce({
        locked: true,
        count: 5,
        remainingAttempts: 0,
        retryAfterSec: 120,
      });

      await expect(
        service.validateUser('testuser', 'plain_pass', '127.0.0.1'),
      ).rejects.toThrow(DomainException);

      expect(mockUsersService.findOne).not.toHaveBeenCalled();
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuthAuditAction.LOGIN_LOCKED,
        }),
      );
    });

    it('records hit when password does not match', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await service.validateUser('testuser', 'wrong_pass', '10.0.0.1');

      expect(mockAttemptLimiterService.hit).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'login-fail',
          key: 'testuser:10.0.0.1',
        }),
      );
    });
  });

  /* ═══════════════════════════════════════════════
     register
  ═══════════════════════════════════════════════ */
  describe('register', () => {
    const dto = {
      username: 'newuser',
      password: 'pass1234',
      confirmPassword: 'pass1234',
      email: 'new@test.com',
      fullName: 'New User',
      phone: '0900000000',
    };

    it('throws DomainException when passwords do not match', async () => {
      await expect(
        service.register({ ...dto, confirmPassword: 'different' }),
      ).rejects.toThrow(DomainException);
    });

    it('throws DomainException when username already exists', async () => {
      mockUserModel.findOne.mockResolvedValueOnce(null);
      mockUsersService.findOne.mockResolvedValue(mockUser);

      await expect(service.register(dto)).rejects.toThrow(DomainException);
    });

    it('throws DomainException when email already exists', async () => {
      mockUserModel.exists.mockResolvedValueOnce(new Types.ObjectId());

      await expect(service.register(dto)).rejects.toThrow(DomainException);
    });

    it('creates user and returns access + refresh tokens on success', async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      mockUsersService.findOne.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({
        _id: new Types.ObjectId(),
        username: dto.username,
        roles: ['user'],
      });
      mockJwtService.sign.mockReturnValue('mocked_token');
      mockJwtService.decode.mockReturnValue({
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      mockRefreshTokenModel.create.mockResolvedValue({});

      const result = await service.register(dto);

      expect(result.data).toHaveProperty('access_token');
      expect(result.data).toHaveProperty('refresh_token');
      expect(result.data).toHaveProperty('account');
      expect(mockOtpService.issue).toHaveBeenCalledWith(
        OtpPurpose.VERIFY_EMAIL,
        'new@test.com',
        expect.any(Object),
      );
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ isEmailVerified: false, email: 'new@test.com' }),
      );
    });
  });

  describe('verifyEmail', () => {
    beforeEach(() => {
      mockOtpService.verifyAndConsume.mockReset();
      mockOtpService.verifyAndConsume.mockResolvedValue({});
      mockUserModel.findOne.mockReset();
      mockUserModel.findOne.mockImplementation(() => ({
        select: () => ({
          lean: () => Promise.resolve(null),
        }),
      }));
    });

    it('returns success when already verified', async () => {
      mockUserModel.findOne.mockImplementationOnce(() => ({
        select: () => ({
          lean: () =>
            Promise.resolve({
              _id: userId,
              username: 'u',
              isEmailVerified: true,
            }),
        }),
      }));

      const result = await service.verifyEmail('a@b.com', '123456');

      expect(result.data).toMatchObject({ message: 'Email already verified' });
      expect(mockOtpService.verifyAndConsume).not.toHaveBeenCalled();
    });

    it('consumes OTP and updates user when pending', async () => {
      mockUserModel.findOne.mockImplementationOnce(() => ({
        select: () => ({
          lean: () =>
            Promise.resolve({
              _id: userId,
              username: 'u',
              isEmailVerified: false,
            }),
        }),
      }));

      await service.verifyEmail('a@b.com', '123456');

      expect(mockOtpService.verifyAndConsume).toHaveBeenCalled();
      expect(mockUserModel.findOneAndUpdate).toHaveBeenCalled();
    });
  });

  describe('resendVerifyEmail', () => {
    beforeEach(() => {
      mockOtpService.issue.mockClear();
      mockUserModel.findOne.mockReset();
      mockUserModel.findOne.mockImplementation(() => ({
        select: () => ({
          lean: () => Promise.resolve(null),
        }),
      }));
    });

    it('returns neutral message when user not found', async () => {
      const result = await service.resendVerifyEmail('ghost@test.com');

      expect(result.data.message).toContain('verification');
      expect(mockOtpService.issue).not.toHaveBeenCalled();
    });

    it('issues OTP when user exists and not verified', async () => {
      mockUserModel.findOne.mockImplementationOnce(() => ({
        select: () => ({
          lean: () =>
            Promise.resolve({
              _id: userId,
              username: 'u',
              isEmailVerified: false,
            }),
        }),
      }));

      await service.resendVerifyEmail('a@b.com');

      expect(mockOtpService.issue).toHaveBeenCalled();
    });
  });

  /* ═══════════════════════════════════════════════
     login
  ═══════════════════════════════════════════════ */
  describe('login', () => {
    it('returns tokens and account info', async () => {
      mockJwtService.sign.mockReturnValue('mocked_token');
      mockJwtService.decode.mockReturnValue({
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      mockRefreshTokenModel.create.mockResolvedValue({});

      const result = await service.login(mockAuthUser, {
        ip: '192.168.1.10',
      });

      expect(mockAttemptLimiterService.reset).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'login-fail',
          key: 'testuser:192.168.1.10',
        }),
      );
      expect(result.access_token).toBe('mocked_token');
      expect(result.refresh_token).toBe('mocked_token');
      expect(result.account.username).toBe('testuser');
    });
  });

  /* ═══════════════════════════════════════════════
     refresh
  ═══════════════════════════════════════════════ */
  describe('refresh', () => {
    const mockTokenRecord = {
      jti: 'some-jti',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 86400_000),
      save: jest.fn().mockResolvedValue(undefined),
    };

    it('throws UnauthorizedException when token type is not refresh', async () => {
      mockJwtService.verify.mockReturnValue({
        typ: 'access',
        sub: '001',
        jti: 'jti1',
      });

      await expect(service.refresh('bad_token')).rejects.toThrow(
        DomainException,
      );
    });

    it('throws UnauthorizedException when token not found in DB', async () => {
      mockJwtService.verify.mockReturnValue({
        typ: 'refresh',
        sub: '000000000000000000000001',
        jti: 'jti1',
      });
      mockRefreshTokenModel.findOne.mockResolvedValue(null);

      await expect(service.refresh('valid_jwt')).rejects.toThrow(
        DomainException,
      );
    });

    it('throws UnauthorizedException when token is expired in DB', async () => {
      mockJwtService.verify.mockReturnValue({
        typ: 'refresh',
        sub: '000000000000000000000001',
        jti: 'jti1',
      });
      mockRefreshTokenModel.findOne.mockResolvedValue({
        ...mockTokenRecord,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.refresh('valid_jwt')).rejects.toThrow(
        DomainException,
      );
    });

    it('rotates refresh token and returns new tokens on success', async () => {
      mockJwtService.verify.mockReturnValue({
        typ: 'refresh',
        sub: '000000000000000000000001',
        jti: 'jti1',
      });
      mockRefreshTokenModel.findOne.mockResolvedValue(mockTokenRecord);
      mockUsersService.findOneById.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('new_token');
      mockJwtService.decode.mockReturnValue({
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      mockRefreshTokenModel.create.mockResolvedValue({});
      mockTokenRecord.save.mockResolvedValue(undefined);

      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest
            .fn()
            .mockResolvedValue({ isActive: true, deletedAt: null }),
        }),
      });

      mockUsersService.findOneById.mockResolvedValue({
        ...mockUser,
        permissions: { apis: [], routers: [] },
        isSuperAdmin: false,
      });

      const result = await service.refresh('old_token');

      expect(mockTokenRecord.isRevoked).toBe(true);
      expect(result.access_token).toBe('new_token');
      expect(result.refresh_token).toBe('new_token');
    });
  });

  /* ═══════════════════════════════════════════════
     logout
  ═══════════════════════════════════════════════ */
  describe('logout', () => {
    it('throws UnauthorizedException when token type is not refresh', async () => {
      mockJwtService.verify.mockReturnValue({
        typ: 'access',
        sub: '001',
        jti: 'j1',
      });

      await expect(service.logout('bad_token')).rejects.toThrow(
        DomainException,
      );
    });

    it('throws UnauthorizedException when session already revoked', async () => {
      mockJwtService.verify.mockReturnValue({
        typ: 'refresh',
        sub: '000000000000000000000001',
        jti: 'j1',
      });
      mockRefreshTokenModel.findOne.mockResolvedValue({
        jti: 'j1',
        isRevoked: true,
      });

      await expect(service.logout('token')).rejects.toThrow(
        DomainException,
      );
    });

    it('returns success message when logout succeeds', async () => {
      mockJwtService.verify.mockReturnValue({
        typ: 'refresh',
        sub: '000000000000000000000001',
        jti: 'j1',
      });
      mockRefreshTokenModel.findOne.mockResolvedValue({
        jti: 'j1',
        isRevoked: false,
        tokenHash: undefined,
        familyId: undefined,
        save: jest.fn().mockResolvedValue(undefined),
      });

      const result = await service.logout('token');

      expect((result as { data: { message: string } }).data.message).toBe(
        'Logged out successfully',
      );
    });
  });

  /* ═══════════════════════════════════════════════
     logoutAll
  ═══════════════════════════════════════════════ */
  describe('logoutAll', () => {
    it('revokes all active tokens for the user and returns count', async () => {
      mockRefreshTokenModel.updateMany.mockResolvedValue({ modifiedCount: 3 });

      const result = await service.logoutAll('000000000000000000000001');

      expect(result.data.modified).toBe(3);
      expect(mockRefreshTokenModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ isRevoked: false }),
        expect.objectContaining({
          $set: expect.objectContaining({ isRevoked: true }),
        }),
      );
    });
  });
});
