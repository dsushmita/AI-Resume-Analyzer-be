import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AccessTokenGuard } from './guards/access-token.guard';
import type { AccessTokenPayload } from './token.service';


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
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return {
      user: result.user,
      organizationId: result.organizationId,
      role: result.role,
    };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.['refresh_token'] as string | undefined;
    if (!token) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const result = await this.authService.refresh(token);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return {
      user: result.user,
      organizationId: result.organizationId,
      role: result.role,
    };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.cookies?.['refresh_token']);
    this.clearAuthCookies(res);
    return { success: true };
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  me(@CurrentUser() user: AccessTokenPayload) {
    return user;
  }

  // --- cookie helpers ---

  private cookieBase() {
    return {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax' as const,
      domain: process.env.COOKIE_DOMAIN,
    };
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    res.cookie('access_token', accessToken, {
      ...this.cookieBase(),
      maxAge: Number(process.env.JWT_ACCESS_TTL) * 1000,
    });
    res.cookie('refresh_token', refreshToken, {
      ...this.cookieBase(),
      path: '/auth',
      maxAge: Number(process.env.JWT_REFRESH_TTL) * 1000,
    });
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie('access_token', this.cookieBase());
    res.clearCookie('refresh_token', { ...this.cookieBase(), path: '/auth' });
  }
}
