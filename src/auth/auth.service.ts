import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
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
}
