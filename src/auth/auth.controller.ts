import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response, Request, CookieOptions } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger';

import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { EnvService } from 'src/env/env.service';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import {
  AuditCategory,
  AuditResourceType,
  AuthAuditAction,
} from 'src/audit-log/enums/audit-log.enum';

import { AuthService } from './auth.service';
import { AuthI18nKeys } from './auth.i18n-keys';
import { DomainException } from 'src/common/exceptions';
import { withI18nSuccess } from 'src/common/i18n/success-envelope';
import {
  ForgotPasswordConfirmDto,
  ForgotPasswordRequestDto,
} from './dto/forgot-password-otp.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly env: EnvService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private resetRefreshTokenCookie(
    res: Response,
    refreshToken?: string,
    shouldSet = false,
  ) {
    const isProduction = this.env.isProduction();
    const sameSite: CookieOptions['sameSite'] = isProduction ? 'strict' : 'lax';
    const baseCookieOptions: Pick<
      CookieOptions,
      'httpOnly' | 'secure' | 'sameSite'
    > = {
      httpOnly: true,
      secure: isProduction,
      sameSite,
    };

    // Clear legacy/global cookie to avoid duplicated cookie name in requests.
    res.clearCookie('refresh_token', {
      ...baseCookieOptions,
      path: '/',
    });

    // Clear scoped auth cookie before setting rotated/new value.
    res.clearCookie('refresh_token', {
      ...baseCookieOptions,
      path: '/api/v1/auth',
    });

    if (shouldSet && refreshToken) {
      res.cookie('refresh_token', refreshToken, {
        ...baseCookieOptions,
        path: '/api/v1/auth',
      });
    }
  }

  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @ApiBearerAuth('bearer')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['username', 'password'],
      properties: {
        username: { type: 'string', example: 'duong' },
        password: { type: 'string', format: 'password', example: '123123123' },
      },
    },
  })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(
      dto.username,
      dto.password,
      typeof req.ip === 'string' ? req.ip : undefined,
    );

    if (!user) {
      void this.auditLogService.log({
        category: AuditCategory.AUTH,
        action: AuthAuditAction.USER_LOGIN_FAILED,
        resourceType: AuditResourceType.AUTH_SESSION,
        ip: req.ip,
        userAgent: req.headers['user-agent']?.toString(),
        metadata: { username: dto.username },
      });
      throw new DomainException(
        'Invalid credentials',
        401,
        'INVALID_CREDENTIALS',
        AuthI18nKeys.unauthorized,
      );
    }
    const userAgentHeader = req.headers['user-agent'];
    const userAgent =
      typeof userAgentHeader === 'string' ? userAgentHeader : undefined;
    const result = await this.authService.login(user, {
      ip: req.ip,
      userAgent,
    });

    this.resetRefreshTokenCookie(res, result.refresh_token, true);

    return withI18nSuccess(
      {
        access_token: result.access_token,
        account: result.account,
      },
      'Logged in successfully',
      AuthI18nKeys.loginSuccess,
    );
  }

  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post('refresh')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['refreshToken'],
      properties: {
        refreshToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token as string | undefined;
    if (!refreshToken || typeof refreshToken !== 'string') {
      throw new DomainException(
        'Unauthorized',
        401,
        'UNAUTHORIZED',
        AuthI18nKeys.unauthorized,
      );
    }

    const userAgentHeader = req.headers['user-agent'];
    const userAgent =
      typeof userAgentHeader === 'string' ? userAgentHeader : undefined;
    const result = await this.authService.refresh(refreshToken, {
      ip: req.ip,
      userAgent,
    });

    if (result.refresh_token) {
      this.resetRefreshTokenCookie(res, result.refresh_token, true);
    }

    return withI18nSuccess(
      result,
      'Session refreshed successfully',
      AuthI18nKeys.refreshSuccess,
    );
  }

  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
    const userAgentHeader = req.headers['user-agent'];
    const userAgent =
      typeof userAgentHeader === 'string' ? userAgentHeader : undefined;
    const user = await this.authService.register(registerDto, {
      ip: req.ip,
      userAgent,
    });
    return user;
  }

  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post('forgot-password/request')
  async requestForgotPassword(@Body() dto: ForgotPasswordRequestDto) {
    return this.authService.requestPasswordReset(dto.identifier);
  }

  @Post('forgot-password/confirm')
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  async confirmForgotPassword(@Body() dto: ForgotPasswordConfirmDto) {
    return this.authService.resetPasswordWithOtp(
      dto.identifier,
      dto.code,
      dto.newPassword,
    );
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token as string | undefined;
    if (!refreshToken || typeof refreshToken !== 'string') {
      return withI18nSuccess(
        { message: 'Already logged out' },
        'Already logged out',
        AuthI18nKeys.logoutAlready,
      );
    }

    const out = await this.authService.logout(refreshToken);

    this.resetRefreshTokenCookie(res);

    return out;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request & { user?: { userId: string } }) {
    if (!req.user?.userId) {
      throw new DomainException(
        'Unauthorized',
        401,
        'UNAUTHORIZED',
        AuthI18nKeys.unauthorized,
      );
    }

    return this.authService.me(req.user.userId);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(@Req() req: Request & { user?: { userId: string } }) {
    if (!req.user?.userId) {
      throw new DomainException(
        'Unauthorized',
        401,
        'UNAUTHORIZED',
        AuthI18nKeys.unauthorized,
      );
    }

    const userId = req.user.userId;
    return this.authService.logoutAll(userId);
  }
}
