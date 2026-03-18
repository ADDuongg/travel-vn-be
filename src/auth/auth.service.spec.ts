import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';

import { AuthService } from './auth.service';
import { RefreshToken } from './schema/refresh_token.schema';
import { User } from 'src/user/schema/user.schema';
import { UserService } from 'src/user/user.service';
import { EnvService } from 'src/env/env.service';
import { PermissionService } from '../permission/permission.service';
import { AuthUser } from 'src/user/interfaces/user-interface';

/* ────────── helpers ────────── */
const userId = new Types.ObjectId('000000000000000000000001');

const mockUser = {
  _id: userId,
  username: 'testuser',
  password: 'hashed_pass',
  roles: ['user'],
  permissions: { apis: [], routers: [] },
};

const mockAuthUser: AuthUser = {
  _id: userId,
  username: mockUser.username,
  roles: mockUser.roles,
  permissions: { apis: [], routers: [] },
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
  findById: jest.fn(),
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
    const map: Record<string, string> = {
      JWT_SECRET: 'test_jwt_secret_minimum_16chars',
      JWT_REFRESH_SECRET: 'test_refresh_secret_min_16chars',
      JWT_REFRESH_TTL: '7d',
      JWT_ISSUER: 'test-app',
      JWT_AUDIENCE: 'test-clients',
    };
    return map[key] ?? def;
  }),
};

const mockPermissionService = {
  resolvePermissions: jest.fn().mockResolvedValue({ apis: [], routers: [] }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

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

      const result = await service.validateUser('testuser', 'plain_pass');

      expect(result).toMatchObject({ username: 'testuser' });
      expect(mockPermissionService.resolvePermissions).toHaveBeenCalledWith(
        mockUser.roles,
      );
    });

    it('returns null when user does not exist', async () => {
      mockUsersService.findOne.mockResolvedValue(null);

      const result = await service.validateUser('unknown', 'any');

      expect(result).toBeNull();
    });

    it('returns null when password does not match', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      const result = await service.validateUser('testuser', 'wrong_pass');

      expect(result).toBeNull();
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

    it('throws BadRequestException when passwords do not match', async () => {
      await expect(
        service.register({ ...dto, confirmPassword: 'different' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when username already exists', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('creates user and returns access + refresh tokens on success', async () => {
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

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result).toHaveProperty('account');
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

      const result = await service.login(mockAuthUser);

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
        UnauthorizedException,
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
        UnauthorizedException,
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
        UnauthorizedException,
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
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when session already revoked', async () => {
      mockJwtService.verify.mockReturnValue({
        typ: 'refresh',
        sub: '000000000000000000000001',
        jti: 'j1',
      });
      mockRefreshTokenModel.updateOne.mockResolvedValue({ modifiedCount: 0 });

      await expect(service.logout('token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('returns success message when logout succeeds', async () => {
      mockJwtService.verify.mockReturnValue({
        typ: 'refresh',
        sub: '000000000000000000000001',
        jti: 'j1',
      });
      mockRefreshTokenModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.logout('token');

      expect(result.message).toBe('Logged out successfully');
    });
  });

  /* ═══════════════════════════════════════════════
     logoutAll
  ═══════════════════════════════════════════════ */
  describe('logoutAll', () => {
    it('revokes all active tokens for the user and returns count', async () => {
      mockRefreshTokenModel.updateMany.mockResolvedValue({ modifiedCount: 3 });

      const result = await service.logoutAll('000000000000000000000001');

      expect(result.modified).toBe(3);
      expect(mockRefreshTokenModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ isRevoked: false }),
        expect.objectContaining({
          $set: expect.objectContaining({ isRevoked: true }),
        }),
      );
    });
  });
});
