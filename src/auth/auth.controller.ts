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
import { AuthService } from './auth.service';
import { ZodValidationPipe } from 'src/pipe/zod-validation.pipe';
import { LoginDto, LoginDtoSchema } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { Response, Request } from 'express';
@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}
  @ApiBearerAuth('bearer')
  @Post('login')
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

    // ✅ SET REFRESH TOKEN VÀO COOKIE
    res.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/api/v1/auth/refresh',
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

    // (nếu bạn rotate refresh token)
    if (result.refresh_token) {
      res.cookie('refresh_token', result.refresh_token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/api/v1/auth/refresh',
      });
    }

    return result;
  }
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    const user = await this.authService.register(registerDto);
    return user;
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) {
      return { message: 'Already logged out' };
    }

    await this.authService.logout(refreshToken);

    res.clearCookie('refresh_token', {
      httpOnly: true,
      // secure: this.env.isProduction(),
      sameSite: 'lax',
      path: '/api/v1/auth/refresh',
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
