/* eslint-disable @typescript-eslint/no-unsafe-argument */
// auth.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { ZodValidationPipe } from 'src/pipe/zod-validation.pipe';
import { LoginDto, LoginDtoSchema } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  ForgotPasswordConfirmDto,
  ForgotPasswordRequestDto,
} from './dto/forgot-password-otp.dto';
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { Response, Request } from 'express';
import { Throttle } from '@nestjs/throttler';
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
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
  @UsePipes(new ZodValidationPipe(LoginDtoSchema))
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(
      dto.username,
      dto.password,
    );

    if (!user) throw new UnauthorizedException();
    const result = await this.authService.login(user);

    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
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
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedException();
    }

    const result = await this.authService.refresh(refreshToken);

    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
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
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    const user = await this.authService.register(registerDto);
    return user;
  }

  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post('forgot-password/request')
  async requestForgotPassword(@Body() dto: ForgotPasswordRequestDto) {
    console.log(`REQUEST_FORGOT_PASSWORD identifier=${dto.identifier}`);

    return this.authService.requestPasswordReset(dto.identifier);
  }

  @Post('forgot-password/confirm')
  async confirmForgotPassword(@Body() dto: ForgotPasswordConfirmDto) {
    return this.authService.resetPasswordWithToken(dto.token, dto.newPassword);
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) {
      return { message: 'Already logged out' };
    }

    await this.authService.logout(refreshToken);

    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
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
  me(@Req() req) {
    return this.authService.me(req.user.userId);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(@Req() req: any) {
    const userId = (req as { user: { userId: string } }).user.userId;
    return this.authService.logoutAll(userId);
  }
}
