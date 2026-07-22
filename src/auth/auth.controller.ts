import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);

    const secure = process.env.COOKIE_SECURE === 'true';
    const common = {
      httpOnly: true, // JavaScript in the browser cannot read these
      secure,
      sameSite: 'lax' as const, // blocks the cookie on cross-site POSTs (CSRF defence)
      domain: process.env.COOKIE_DOMAIN,
    };

    res.cookie('access_token', result.accessToken, {
      ...common,
      maxAge: Number(process.env.JWT_ACCESS_TTL) * 1000,
    });
    res.cookie('refresh_token', result.refreshToken, {
      ...common,
      path: '/auth', // only sent to auth routes, limiting its exposure
      maxAge: Number(process.env.JWT_REFRESH_TTL) * 1000,
    });

    // Tokens live in cookies only — never in the response body
    return {
      user: result.user,
      organizationId: result.organizationId,
      role: result.role,
    };
  }
}
