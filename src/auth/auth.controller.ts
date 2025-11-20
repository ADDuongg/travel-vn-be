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
import { LoginDtoSchema } from './dto/login.dto';
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
  async login(@Body() dto: any) {
    const user = await this.authService.validateUser(
      dto.username,
      dto.password,
    );

    if (!user) throw new UnauthorizedException();
    return this.authService.login(user);
  }
  @Post('refresh')
  async refresh(@Req() req) {
    const refreshToken = req.cookies.refreshToken; // refresh nên để trong cookie
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
  async logoutAll(@Req() req) {
    const userId = req.user.userId;
    console.log('Logout all for userId:', req.user);

    return this.authService.logoutAll(userId);
  }
}
