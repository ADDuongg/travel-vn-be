import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger';

import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { EnvService } from 'src/env/env.service';

import { AuthService } from './auth.service';
import {
  ForgotPasswordConfirmDto,
  ForgotPasswordRequestDto,
} from './dto/forgot-password-otp.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly env: EnvService,
  ) {}
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
    );

    if (!user) throw new UnauthorizedException();
    const userAgentHeader = req.headers['user-agent'];
    const userAgent =
      typeof userAgentHeader === 'string' ? userAgentHeader : undefined;
    const result = await this.authService.login(user, {
      ip: req.ip,
      userAgent,
    });

    const isProduction = this.env.isProduction();
    res.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/api/v1/auth',
    });

    return {
      access_token: result.access_token,
      account: result.account,
    };
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
      throw new UnauthorizedException();
    }

    const userAgentHeader = req.headers['user-agent'];
    const userAgent =
      typeof userAgentHeader === 'string' ? userAgentHeader : undefined;
    const result = await this.authService.refresh(refreshToken, {
      ip: req.ip,
      userAgent,
    });

    const isProduction = this.env.isProduction();
    if (result.refresh_token) {
      res.cookie('refresh_token', result.refresh_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        path: '/api/v1/auth',
      });
    }

    return result;
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
    return this.authService.resetPasswordWithToken(dto.token, dto.newPassword);
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token as string | undefined;
    if (!refreshToken || typeof refreshToken !== 'string') {
      return { message: 'Already logged out' };
    }

    await this.authService.logout(refreshToken);

    const isProduction = this.env.isProduction();
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/api/v1/auth',
    });

    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request & { user?: { userId: string } }) {
    if (!req.user?.userId) {
      throw new UnauthorizedException();
    }

    return this.authService.me(req.user.userId);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(@Req() req: Request & { user?: { userId: string } }) {
    if (!req.user?.userId) {
      throw new UnauthorizedException();
    }

    const userId = req.user.userId;
    return this.authService.logoutAll(userId);
  }
}
