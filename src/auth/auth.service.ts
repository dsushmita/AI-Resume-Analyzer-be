import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    //is this mean current password?

    const passwordHash = await this.passwords.hash(dto.password);

    // One transaction: a user must ALWAYS end up with a company and an owner membership
    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        //creation of organization
        data: { name: dto.companyName },
      });

      return tx.user.create({
        // creating user with memberaship and organization
        data: {
          email: dto.email,
          name: dto.name,
          passwordHash,
          memberships: {
            create: {
              role: 'OWNER',
              organization: { connect: { id: organization.id } },
            },
          },
        },
        // Never return the password hash to the client
        select: { id: true, email: true, name: true, createdAt: true }, // selecting only specific fields to return to the client, excluding sensitive information like passwordHash
      });
    });
  }
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { memberships: { take: 1, orderBy: { createdAt: 'asc' } } },
    });

    // Same vague error whether the email or the password was wrong
    const valid =
      user && (await this.passwords.compare(dto.password, user.passwordHash));
    if (!user || !valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const membership = user.memberships[0];
    if (!membership) {
      throw new UnauthorizedException('User belongs to no organization');
    }

    const accessToken = await this.tokens.signAccessToken({
      sub: user.id,
      organizationId: membership.organizationId,
      role: membership.role,
    });
    const refreshToken = await this.tokens.signRefreshToken(user.id);

    // Store only the hash, so a stolen database can't be used to impersonate anyone
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.tokens.hashToken(refreshToken),
        userId: user.id,
        expiresAt: new Date(
          Date.now() + Number(process.env.JWT_REFRESH_TTL) * 1000,
        ),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name },
      organizationId: membership.organizationId,
      role: membership.role,
    };
  }

  async refresh(refreshToken: string) {
    // 1. Signature + expiry must check out
    let payload: { sub: string };
    try {
      payload = await this.tokens.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    // 2. The token must still be live in the database (not rotated away or revoked)
    const tokenHash = this.tokens.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token no longer valid');
    }

    // 3. Reload user + membership so the new access token reflects current role/org
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { memberships: { take: 1, orderBy: { createdAt: 'asc' } } },
    });
    const membership = user?.memberships[0];
    if (!user || !membership) {
      throw new UnauthorizedException('User no longer valid');
    }

    const accessToken = await this.tokens.signAccessToken({
      sub: user.id,
      organizationId: membership.organizationId,
      role: membership.role,
    });
    const newRefreshToken = await this.tokens.signRefreshToken(user.id);

    // 4. Rotate atomically: kill the old token and store the new one, all-or-nothing
    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      }),
      this.prisma.refreshToken.create({
        data: {
          tokenHash: this.tokens.hashToken(newRefreshToken),
          userId: user.id,
          expiresAt: new Date(
            Date.now() + Number(process.env.JWT_REFRESH_TTL) * 1000,
          ),
        },
      }),
    ]);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: { id: user.id, email: user.email, name: user.name },
      organizationId: membership.organizationId,
      role: membership.role,
    };
  }

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    // updateMany so a missing/already-revoked token is a no-op, not an error
    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash: this.tokens.hashToken(refreshToken),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }
}
