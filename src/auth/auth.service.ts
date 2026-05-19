/* eslint-disable @typescript-eslint/no-floating-promises */
import { Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { addDays } from 'date-fns';

import { UserService } from 'src/user/user.service';
import { RegisterDto } from './dto/register.dto';
import { RefreshToken } from './schema/refresh_token.schema';
import { EnvService } from 'src/env/env.service';
import { OtpService } from 'src/otp/otp.service';
import { OtpPurpose } from 'src/otp/otp.types';
import { AttemptLimiterService } from 'src/attempt-limiter/attempt-limiter.service';
import type { AttemptLimiterOptions } from 'src/attempt-limiter/attempt-limiter.types';

import {
  AccessTokenPayload,
  JwtDecoded,
  RefreshTokenPayload,
} from './interfaces/jwt-payload.interface';
import { AuthUser } from 'src/user/interfaces/user-interface';
import { PermissionService } from '../permission/permission.service';
import { RbacService } from 'src/rbac/rbac.service';
import { User, UserDocument } from 'src/user/schema/user.schema';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import {
  AuditCategory,
  AuditResourceType,
  AuthAuditAction,
} from 'src/audit-log/enums/audit-log.enum';
import { DomainException } from 'src/common/exceptions';
import { withI18nSuccess } from 'src/common/i18n/success-envelope';
import { AuthI18nKeys } from './auth.i18n-keys';
import { isJwtEmailVerifiedEffective } from 'src/common/auth/email-verified.util';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshToken>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly usersService: UserService,
    private readonly jwtService: JwtService,
    private readonly env: EnvService,
    private readonly permissionService: PermissionService,
    private readonly rbacService: RbacService,
    private readonly otpService: OtpService,
    private readonly attemptLimiter: AttemptLimiterService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async validateUser(
    username: string,
    pass: string,
    ip?: string,
  ): Promise<AuthUser | null> {
    const limiterOpts = this.loginLimiterOptions(username, ip);
    const limiterStatus = await this.attemptLimiter.check(limiterOpts);
    if (limiterStatus.locked) {
      this.auditLogService.log({
        category: AuditCategory.AUTH,
        action: AuthAuditAction.LOGIN_LOCKED,
        resourceType: AuditResourceType.AUTH_SESSION,
        ip,
        metadata: {
          username,
          retryAfterSec: limiterStatus.retryAfterSec,
        },
      });
      throw new DomainException(
        'Too many login attempts, try again later',
        429,
        'LOGIN_LOCKED',
        AuthI18nKeys.loginTooManyAttempts,
      );
    }

    const user = await this.usersService.findOne(username);
    if (!user) return null;

    const match = await bcrypt.compare(pass, user.password);
    if (!match) {
      await this.attemptLimiter.hit(limiterOpts);
      return null;
    }

    if (!user.isActive || user.deletedAt) {
      await this.attemptLimiter.hit(limiterOpts);
      return null;
    }

    const permissions = await this.permissionService.resolvePermissions(
      user.roles || [],
    );

    const rbacPermissions = await this.rbacService.resolveFlatPermissions(
      user.roles || [],
      user.isSuperAdmin ?? false,
    );

    return {
      _id: user._id,
      username: user.username,
      roles: user.roles,
      permissions,
      rbacPermissions,
      isSuperAdmin: user.isSuperAdmin ?? false,
      isEmailVerified: user.isEmailVerified,
    };
  }

  private loginLimiterOptions(
    username: string,
    ip?: string,
  ): AttemptLimiterOptions {
    const safeIp = typeof ip === 'string' && ip.length > 0 ? ip : 'unknown';
    return {
      scope: 'login-fail',
      key: `${username}:${safeIp}`,
      maxAttempts: this.env.get('LOGIN_FAIL_MAX_ATTEMPTS'),
      windowSec: this.env.get('LOGIN_FAIL_WINDOW_SEC'),
      lockoutSec: this.env.get('LOGIN_FAIL_LOCKOUT_SEC'),
    };
  }

  private signAccessToken(user: AuthUser): string {
    const expiresIn = this.env.isProduction() ? '10m' : '1h';

    const payload: AccessTokenPayload = {
      sub: String(user._id),
      username: user.username,
      roles: user.roles,
      rbacPermissions: user.rbacPermissions ?? [],
      isSuperAdmin: user.isSuperAdmin ?? false,
      isEmailVerified: isJwtEmailVerifiedEffective(user.isEmailVerified),
      typ: 'access',
    };

    return this.jwtService.sign(payload, {
      secret: this.env.get('JWT_SECRET', 'your_jwt_secret'),
      expiresIn,
      issuer: this.env.get('JWT_ISSUER', 'vn-tours'),
      audience: this.env.get('JWT_AUDIENCE', 'vn-tours-clients'),
      jwtid: uuidv4(),
    });
  }

  private signRefreshToken(user: AuthUser): { token: string; jti: string } {
    const jti = uuidv4();

    const payload: RefreshTokenPayload = {
      sub: String(user._id),
      typ: 'refresh',
    };

    const options: JwtSignOptions = {
      secret: this.env.get('JWT_REFRESH_SECRET', 'your_jwt_refresh_secret'),
      expiresIn: this.env.get('JWT_REFRESH_TTL', '7d'),
      issuer: this.env.get('JWT_ISSUER', 'vn-tours'),
      audience: this.env.get('JWT_AUDIENCE', 'vn-tours-clients'),
      jwtid: jti,
    };

    const token = this.jwtService.sign(payload, options);
    return { token, jti };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async revokeRefreshTokenFamily(familyId: string) {
    await this.refreshTokenModel.updateMany(
      { familyId },
      { $set: { isRevoked: true, keepUntil: addDays(new Date(), 1) } },
    );
  }

  async login(user: AuthUser, meta: { ip?: string; userAgent?: string } = {}) {
    await this.attemptLimiter.reset(
      this.loginLimiterOptions(user.username, meta.ip),
    );

    const accessToken = this.signAccessToken(user);
    const { token: refreshToken, jti } = this.signRefreshToken(user);

    await this.saveRefreshToken(user, refreshToken, jti, {
      familyId: jti,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    const permissions =
      user.permissions ??
      (await this.permissionService.resolvePermissions(user.roles || []));

    const rbacPermissions =
      user.rbacPermissions ??
      (await this.rbacService.resolveFlatPermissions(
        user.roles || [],
        user.isSuperAdmin ?? false,
      ));

    this.auditLogService.log({
      category: AuditCategory.AUTH,
      action: AuthAuditAction.USER_LOGIN,
      resourceType: AuditResourceType.AUTH_SESSION,
      userId: user._id,
      username: user.username,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      account: {
        _id: user._id,
        username: user.username,
        roles: user.roles,
        permissions,
        rbacPermissions,
        isSuperAdmin: user.isSuperAdmin ?? false,
        isEmailVerified: isJwtEmailVerifiedEffective(user.isEmailVerified),
      },
    };
  }

  private async findUserForPasswordReset(identifier: string): Promise<{
    _id: Types.ObjectId;
    username: string;
    email: string;
    tokenVersion?: number;
  }> {
    type ResetUser = {
      _id: Types.ObjectId;
      username: string;
      email?: string;
      tokenVersion?: number;
    };

    const user = await this.userModel
      .findOne({
        $or: [
          { username: identifier },
          { email: identifier },
          { phone: identifier },
        ],
      })
      .select('_id username email tokenVersion')
      .lean<ResetUser | null>();

    if (!user) {
      throw new DomainException(
        'User not found',
        400,
        'USER_NOT_FOUND',
        AuthI18nKeys.userNotFound,
      );
    }

    const email = user.email?.trim();
    if (!email) {
      throw new DomainException(
        'User does not have an email',
        400,
        'USER_NO_EMAIL',
        AuthI18nKeys.userNoEmail,
      );
    }

    return {
      _id: user._id,
      username: user.username,
      email,
      tokenVersion: user.tokenVersion,
    };
  }

  async requestPasswordReset(identifier: string) {
    const user = await this.findUserForPasswordReset(identifier);

    await this.otpService.issue(OtpPurpose.RESET_PASSWORD, user.email, {
      meta: {
        userId: String(user._id),
        username: user.username,
      },
    });

    this.auditLogService.log({
      category: AuditCategory.AUTH,
      action: AuthAuditAction.PASSWORD_RESET_REQUEST,
      resourceType: AuditResourceType.AUTH_SESSION,
      userId: user._id,
      username: user.username,
      metadata: { identifier },
    });

    return withI18nSuccess(
      { message: 'Password reset email sent' },
      'Password reset email sent',
      AuthI18nKeys.passwordResetEmailSent,
    );
  }

  async resetPasswordWithOtp(
    identifier: string,
    code: string,
    newPassword: string,
  ) {
    if (!newPassword || newPassword.length < 6) {
      throw new DomainException(
        'New password is too short',
        400,
        'PASSWORD_TOO_SHORT',
        AuthI18nKeys.passwordTooShort,
      );
    }

    const user = await this.findUserForPasswordReset(identifier);

    await this.otpService.verifyAndConsume(
      OtpPurpose.RESET_PASSWORD,
      user.email,
      code,
    );

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updated = await this.userModel
      .findOneAndUpdate(
        { _id: user._id, tokenVersion: user.tokenVersion ?? 0 },
        { $set: { password: hashedPassword }, $inc: { tokenVersion: 1 } },
        { new: true },
      )
      .select('_id username roles')
      .lean<AuthUser | null>();

    if (!updated) {
      throw new DomainException(
        'Invalid or already used reset token',
        401,
        'INVALID_OR_USED_RESET_TOKEN',
        AuthI18nKeys.invalidOrUsedResetToken,
      );
    }

    await this.logoutAll(String(user._id));

    this.auditLogService.log({
      category: AuditCategory.AUTH,
      action: AuthAuditAction.PASSWORD_RESET_CONFIRM,
      resourceType: AuditResourceType.AUTH_SESSION,
      userId: updated._id,
      username: updated.username,
    });

    return withI18nSuccess(
      { message: 'Password has been reset successfully' },
      'Password has been reset successfully',
      AuthI18nKeys.passwordResetSuccess,
    );
  }

  async verifyEmail(emailRaw: string, code: string) {
    const email = emailRaw.trim().toLowerCase();
    if (!email) {
      throw new DomainException(
        'Email is required',
        400,
        'EMAIL_REQUIRED',
        AuthI18nKeys.emailRequired,
      );
    }

    const row = await this.userModel
      .findOne({ email })
      .select('_id username isEmailVerified')
      .lean<{
        _id: Types.ObjectId;
        username: string;
        isEmailVerified?: boolean;
      } | null>();

    if (!row) {
      this.auditLogService.log({
        category: AuditCategory.AUTH,
        action: AuthAuditAction.EMAIL_VERIFY_FAILED,
        resourceType: AuditResourceType.USER,
        metadata: { email, reason: 'user_not_found' },
      });
      throw new DomainException(
        'Invalid verification request',
        400,
        'EMAIL_VERIFY_INVALID',
        AuthI18nKeys.emailVerifyInvalid,
      );
    }

    if (isJwtEmailVerifiedEffective(row.isEmailVerified)) {
      this.auditLogService.log({
        category: AuditCategory.AUTH,
        action: AuthAuditAction.EMAIL_VERIFIED,
        resourceType: AuditResourceType.USER,
        resourceId: row._id,
        userId: row._id,
        username: row.username,
        metadata: { email, alreadyVerified: true },
      });
      return withI18nSuccess(
        { message: 'Email already verified' },
        'Email already verified',
        AuthI18nKeys.emailAlreadyVerified,
      );
    }

    try {
      await this.otpService.verifyAndConsume(
        OtpPurpose.VERIFY_EMAIL,
        email,
        code,
      );
    } catch (err) {
      this.auditLogService.log({
        category: AuditCategory.AUTH,
        action: AuthAuditAction.EMAIL_VERIFY_FAILED,
        resourceType: AuditResourceType.USER,
        resourceId: row._id,
        userId: row._id,
        username: row.username,
        metadata: { email },
      });
      throw err;
    }

    const updated = await this.userModel
      .findOneAndUpdate(
        { _id: row._id, isEmailVerified: false },
        { $set: { isEmailVerified: true, emailVerifiedAt: new Date() } },
        { new: true },
      )
      .select('_id username')
      .lean<{ _id: Types.ObjectId; username: string } | null>();

    if (!updated) {
      return withI18nSuccess(
        { message: 'Email already verified' },
        'Email already verified',
        AuthI18nKeys.emailAlreadyVerified,
      );
    }

    this.auditLogService.log({
      category: AuditCategory.AUTH,
      action: AuthAuditAction.EMAIL_VERIFIED,
      resourceType: AuditResourceType.USER,
      resourceId: updated._id,
      userId: updated._id,
      username: updated.username,
      metadata: { email },
    });

    return withI18nSuccess(
      { message: 'Email verified successfully' },
      'Email verified successfully',
      AuthI18nKeys.emailVerifySuccess,
    );
  }

  async resendVerifyEmail(emailRaw: string) {
    const email = emailRaw.trim().toLowerCase();
    if (!email) {
      throw new DomainException(
        'Email is required',
        400,
        'EMAIL_REQUIRED',
        AuthI18nKeys.emailRequired,
      );
    }

    const row = await this.userModel
      .findOne({ email })
      .select('_id username isEmailVerified')
      .lean<{
        _id: Types.ObjectId;
        username: string;
        isEmailVerified?: boolean;
      } | null>();

    if (!row) {
      return withI18nSuccess(
        {
          message:
            'If an account exists for this email, a verification code was sent',
        },
        'If an account exists for this email, a verification code was sent',
        AuthI18nKeys.emailVerifySent,
      );
    }

    if (isJwtEmailVerifiedEffective(row.isEmailVerified)) {
      return withI18nSuccess(
        { message: 'Email already verified' },
        'Email already verified',
        AuthI18nKeys.emailAlreadyVerified,
      );
    }

    try {
      await this.otpService.issue(OtpPurpose.VERIFY_EMAIL, email, {
        meta: { userId: String(row._id), username: row.username },
      });
    } catch (err) {
      if (
        err instanceof DomainException &&
        err.errorCode === 'RATE_LIMIT' &&
        err.statusCode === 429
      ) {
        throw new DomainException(
          'Too many resend attempts, try again later',
          429,
          'EMAIL_VERIFY_RESEND_THROTTLED',
          AuthI18nKeys.emailVerifyResendThrottled,
        );
      }
      throw err;
    }

    this.auditLogService.log({
      category: AuditCategory.AUTH,
      action: AuthAuditAction.EMAIL_VERIFY_RESEND,
      resourceType: AuditResourceType.USER,
      resourceId: row._id,
      userId: row._id,
      username: row.username,
      metadata: { email },
    });

    return withI18nSuccess(
      {
        message:
          'If an account exists for this email, a verification code was sent',
      },
      'If an account exists for this email, a verification code was sent',
      AuthI18nKeys.emailVerifySent,
    );
  }

  async register(
    dto: RegisterDto,
    meta: { ip?: string; userAgent?: string } = {},
  ) {
    if (dto.password !== dto.confirmPassword) {
      throw new DomainException(
        'Password confirmation does not match',
        400,
        'PASSWORD_CONFIRM_MISMATCH',
        AuthI18nKeys.passwordConfirmMismatch,
      );
    }

    const emailNorm = dto.email?.trim().toLowerCase();
    if (!emailNorm) {
      throw new DomainException(
        'Email is required',
        400,
        'EMAIL_REQUIRED',
        AuthI18nKeys.emailRequired,
      );
    }

    const emailTaken = await this.userModel.exists({ email: emailNorm });
    if (emailTaken) {
      throw new DomainException(
        'Email already exists',
        409,
        'EMAIL_EXISTS',
        AuthI18nKeys.emailExists,
      );
    }

    const existing = await this.usersService.findOne(dto.username);
    if (existing) {
      throw new DomainException(
        'Username already exists',
        409,
        'USERNAME_EXISTS',
        AuthI18nKeys.usernameExists,
      );
    }

    const addressInput = (dto as any).address;
    const normalizedAddress =
      addressInput && typeof addressInput === 'string'
        ? { detail: addressInput }
        : addressInput;

    const created = await this.usersService.create({
      username: dto.username,
      password: dto.password,
      roles: ['user'],
      email: emailNorm,
      fullName: dto.fullName,
      phone: dto.phone,
      dateOfBirth: dto.dateOfBirth,
      address: normalizedAddress,
      permissions: {
        apis: [],
        routers: [],
      },
      isEmailVerified: false,
    });

    await this.otpService.issue(OtpPurpose.VERIFY_EMAIL, emailNorm, {
      meta: {
        userId: String(created._id),
        username: created.username,
      },
    });

    this.auditLogService.log({
      category: AuditCategory.AUTH,
      action: AuthAuditAction.EMAIL_VERIFY_REQUEST,
      resourceType: AuditResourceType.USER,
      resourceId: created._id,
      userId: created._id,
      username: created.username,
      metadata: { email: emailNorm },
    });

    const user: AuthUser = {
      _id: created._id,
      username: created.username,
      roles: created.roles,
      permissions: {
        apis: [],
        routers: [],
      },
      rbacPermissions: [],
      isSuperAdmin: false,
      isEmailVerified: false,
    };

    const accessToken = this.signAccessToken(user);
    const { token: refreshToken, jti } = this.signRefreshToken(user);

    await this.saveRefreshToken(user, refreshToken, jti, {
      familyId: jti,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    this.auditLogService.log({
      category: AuditCategory.AUTH,
      action: AuthAuditAction.USER_REGISTER,
      resourceType: AuditResourceType.USER,
      resourceId: created._id,
      userId: created._id,
      username: created.username,
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: { verifyEmailPending: true },
    });

    return withI18nSuccess(
      {
        access_token: accessToken,
        refresh_token: refreshToken,
        account: {
          ...user,
          isEmailVerified: isJwtEmailVerifiedEffective(user.isEmailVerified),
        },
      },
      'Registered successfully',
      AuthI18nKeys.registerSuccess,
    );
  }

  async refresh(
    oldRefreshToken: string,
    meta: { ip?: string; userAgent?: string } = {},
  ) {
    try {
      const payload = this.jwtService.verify<RefreshTokenPayload>(
        oldRefreshToken,
        {
          secret: this.env.get('JWT_REFRESH_SECRET', 'your_jwt_refresh_secret'),
          issuer: this.env.get('JWT_ISSUER', 'vn-tours'),
          audience: this.env.get('JWT_AUDIENCE', 'vn-tours-clients'),
        },
      );

      if (payload.typ !== 'refresh') {
        throw new DomainException(
          'Invalid token type',
          401,
          'INVALID_TOKEN_TYPE',
          AuthI18nKeys.invalidTokenType,
        );
      }

      const existing = await this.refreshTokenModel.findOne({
        jti: payload.jti,
        userId: new Types.ObjectId(payload.sub),
      });

      if (!existing) {
        throw new DomainException(
          'Refresh token not found',
          401,
          'REFRESH_TOKEN_NOT_FOUND',
          AuthI18nKeys.refreshTokenNotFound,
        );
      }

      if (existing.isRevoked) {
        const familyId = existing.familyId || existing.jti;
        if (!existing.familyId) {
          (existing as any).familyId = familyId;
          await (existing as any).save();
        }
        await this.revokeRefreshTokenFamily(familyId);
        await this.logoutAll(payload.sub);
        this.auditLogService.log({
          category: AuditCategory.AUTH,
          action: AuthAuditAction.TOKEN_REUSE_DETECTED,
          resourceType: AuditResourceType.AUTH_SESSION,
          userId: payload.sub,
          ip: meta.ip,
          userAgent: meta.userAgent,
        });
        throw new DomainException(
          'Token reuse detected',
          401,
          'TOKEN_REUSE_DETECTED',
          AuthI18nKeys.tokenReuseDetected,
        );
      }

      const currentHash = this.hashToken(oldRefreshToken);
      if (existing.tokenHash && existing.tokenHash !== currentHash) {
        const familyId = existing.familyId || existing.jti;
        if (!existing.familyId) {
          (existing as any).familyId = familyId;
          await (existing as any).save();
        }
        await this.revokeRefreshTokenFamily(familyId);
        await this.logoutAll(payload.sub);
        this.auditLogService.log({
          category: AuditCategory.AUTH,
          action: AuthAuditAction.TOKEN_REUSE_DETECTED,
          resourceType: AuditResourceType.AUTH_SESSION,
          userId: payload.sub,
          ip: meta.ip,
          userAgent: meta.userAgent,
        });
        throw new DomainException(
          'Token reuse detected',
          401,
          'TOKEN_REUSE_DETECTED',
          AuthI18nKeys.tokenReuseDetected,
        );
      }
      if (!existing.tokenHash) {
        (existing as any).tokenHash = currentHash;
      }
      if (!existing.familyId) {
        (existing as any).familyId = existing.jti;
      }
      await (existing as any).save();

      if (existing.expiresAt < new Date()) {
        throw new DomainException(
          'Refresh token expired',
          401,
          'REFRESH_TOKEN_EXPIRED',
          AuthI18nKeys.refreshTokenExpired,
        );
      }

      existing.isRevoked = true;
      (existing as any).keepUntil = addDays(new Date(), 1);
      await existing.save();

      const alive = await this.userModel
        .findById(payload.sub)
        .select('isActive deletedAt')
        .lean<{ isActive?: boolean; deletedAt?: Date | null } | null>();
      if (!alive || alive.deletedAt || !alive.isActive) {
        throw new DomainException(
          'Unauthorized',
          401,
          'UNAUTHORIZED',
          AuthI18nKeys.unauthorized,
        );
      }

      const user = await this.usersService.findOneById(payload.sub);
      if (!user)
        throw new DomainException(
          'Unauthorized',
          401,
          'UNAUTHORIZED',
          AuthI18nKeys.unauthorized,
        );

      const rbacPermissions = await this.rbacService.resolveFlatPermissions(
        user.roles || [],
        user.isSuperAdmin ?? false,
      );
      const sessionUser: AuthUser = { ...user, rbacPermissions };

      const { token: newRefreshToken, jti } =
        this.signRefreshToken(sessionUser);

      await this.saveRefreshToken(sessionUser, newRefreshToken, jti, {
        familyId: (existing as any).familyId,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });

      const newAccessToken = this.signAccessToken(sessionUser);
      const permissions = await this.permissionService.resolvePermissions(
        user.roles || [],
      );

      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        account: {
          _id: user._id,
          username: user.username,
          roles: user.roles,
          permissions,
          rbacPermissions,
          isSuperAdmin: user.isSuperAdmin ?? false,
          isEmailVerified: isJwtEmailVerifiedEffective(
            (user as { isEmailVerified?: boolean }).isEmailVerified,
          ),
        },
      };
    } catch (err) {
      if (err instanceof DomainException && err.statusCode === 401) {
        throw err;
      }
      throw new DomainException(
        'Invalid refresh token',
        401,
        'INVALID_REFRESH_TOKEN',
        AuthI18nKeys.invalidRefreshToken,
      );
    }
  }

  async me(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-password')
      .lean();

    if (!user) {
      throw new DomainException(
        'Unauthorized',
        401,
        'UNAUTHORIZED',
        AuthI18nKeys.meUserNotFound,
      );
    }
    const permissions = await this.permissionService.resolvePermissions(
      user.roles || [],
    );
    const rbacPermissions = await this.rbacService.resolveFlatPermissions(
      user.roles || [],
      !!(user as { isSuperAdmin?: boolean }).isSuperAdmin,
    );
    return withI18nSuccess(
      {
        ...user,
        id: String(user._id),
        permissions,
        rbacPermissions,
        isSuperAdmin: !!(user as { isSuperAdmin?: boolean }).isSuperAdmin,
        isEmailVerified: isJwtEmailVerifiedEffective(
          (user as { isEmailVerified?: boolean }).isEmailVerified,
        ),
      },
      'Profile loaded',
      AuthI18nKeys.meSuccess,
    );
  }

  async logout(refreshToken: string) {
    const payload = this.jwtService.verify<RefreshTokenPayload>(refreshToken, {
      secret: this.env.get('JWT_REFRESH_SECRET', 'your_jwt_refresh_secret'),
      issuer: this.env.get('JWT_ISSUER', 'vn-tours'),
      audience: this.env.get('JWT_AUDIENCE', 'vn-tours-clients'),
    });

    if (payload.typ !== 'refresh') {
      throw new DomainException(
        'Invalid token type',
        401,
        'INVALID_TOKEN_TYPE',
        AuthI18nKeys.invalidTokenType,
      );
    }

    const existing = await this.refreshTokenModel.findOne({
      jti: payload.jti,
      userId: new Types.ObjectId(payload.sub),
    });
    if (!existing || existing.isRevoked) {
      throw new DomainException(
        'Session already logged out',
        401,
        'SESSION_LOGGED_OUT',
        AuthI18nKeys.sessionLoggedOut,
      );
    }

    const currentHash = this.hashToken(refreshToken);
    if (existing.tokenHash && existing.tokenHash !== currentHash) {
      const familyId = existing.familyId || existing.jti;
      if (!existing.familyId) {
        (existing as any).familyId = familyId;
        await (existing as any).save();
      }
      await this.revokeRefreshTokenFamily(familyId);
      await this.logoutAll(payload.sub);
      throw new DomainException(
        'Token reuse detected',
        401,
        'TOKEN_REUSE_DETECTED',
        AuthI18nKeys.tokenReuseDetected,
      );
    }

    if (!existing.tokenHash) {
      (existing as any).tokenHash = currentHash;
    }
    if (!existing.familyId) {
      (existing as any).familyId = existing.jti;
    }

    (existing as any).isRevoked = true;
    (existing as any).keepUntil = addDays(new Date(), 1);
    await (existing as any).save();

    this.auditLogService.log({
      category: AuditCategory.AUTH,
      action: AuthAuditAction.USER_LOGOUT,
      resourceType: AuditResourceType.AUTH_SESSION,
      userId: payload.sub,
    });

    return withI18nSuccess(
      { message: 'Logged out successfully' },
      'Logged out successfully',
      AuthI18nKeys.logoutSuccess,
    );
  }

  async logoutAll(userId: string) {
    const result = await this.refreshTokenModel.updateMany(
      {
        userId: new Types.ObjectId(userId),
        isRevoked: false,
        expiresAt: { $gt: new Date() },
      },
      {
        $set: {
          isRevoked: true,
          keepUntil: addDays(new Date(), 1),
        },
      },
    );

    this.auditLogService.log({
      category: AuditCategory.AUTH,
      action: AuthAuditAction.USER_LOGOUT_ALL,
      resourceType: AuditResourceType.AUTH_SESSION,
      userId,
      metadata: { sessionsRevoked: result.modifiedCount },
    });

    return withI18nSuccess(
      {
        message: 'All sessions logged out successfully',
        modified: result.modifiedCount,
      },
      'All sessions logged out successfully',
      AuthI18nKeys.logoutAllSuccess,
    );
  }

  private async saveRefreshToken(
    user: AuthUser,
    token: string,
    jti: string,
    options: { familyId?: string; ip?: string; userAgent?: string } = {},
  ): Promise<void> {
    function isJwtDecoded(payload: unknown): payload is JwtDecoded {
      return (
        typeof payload === 'object' &&
        payload !== null &&
        'exp' in payload &&
        typeof (payload as Record<string, unknown>).exp === 'number'
      );
    }

    const decoded: unknown = this.jwtService.decode(token);

    if (!isJwtDecoded(decoded)) {
      throw new DomainException(
        'Invalid refresh token',
        401,
        'INVALID_REFRESH_TOKEN',
        AuthI18nKeys.invalidRefreshToken,
      );
    }

    const expiresAt = new Date(decoded.exp * 1000);

    await this.refreshTokenModel.create({
      jti,
      userId: user._id,
      familyId: options.familyId,
      tokenHash: this.hashToken(token),
      isRevoked: false,
      expiresAt,
      keepUntil: addDays(expiresAt, 1),
      ip: options.ip,
      userAgent: options.userAgent,
    });
  }
}
