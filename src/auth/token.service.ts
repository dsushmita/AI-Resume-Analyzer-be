import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';

export interface AccessTokenPayload {
  sub: string;
  organizationId: string;
  role: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: Number(this.config.get('JWT_ACCESS_TTL')),
    });
  }

  signRefreshToken(userId: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: Number(this.config.get('JWT_REFRESH_TTL')),
      },
    );
  }

  // Refresh tokens are long and random, so a fast digest is enough — bcrypt is for human passwords
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
