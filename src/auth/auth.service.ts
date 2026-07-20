import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
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
}
