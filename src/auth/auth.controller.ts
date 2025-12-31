// auth.controller.ts
import {
  Body,
  Controller,
  Post,
  Req,
  Request,
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

@Controller('auth')
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
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(
      dto.username,
      dto.password,
    );

    if (!user) throw new UnauthorizedException();
    return this.authService.login(user);
  }

  /* @ApiBody({})
  @Post('refresh')
  async refresh(@Req() req) {
    // const refreshToken = req.cookies.refreshToken; // refresh nên để trong cookie
    console.log('1234', req);

    return this.authService.refresh(req);
  } */
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
  async refresh(@Body('refreshToken') refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    return this.authService.refresh(refreshToken);
  }
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    const user = await this.authService.register(registerDto);
    return user;
  }
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(@Req() req: any) {
    const userId = (req as { user: { userId: string } }).user.userId;
    return this.authService.logoutAll(userId);
  }
}
