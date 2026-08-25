import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { AccessTokenPayload, TokenService } from '../auth/token.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // invites stay valid for 7 days

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  // OWNER/ADMIN invites someone into THEIR org; returns the raw token (prod would email a link)
  async create(inviter: AccessTokenPayload, dto: CreateInvitationDto) {
    if (dto.role === Role.OWNER) {
      throw new BadRequestException(
        'An organization keeps its single founding owner',
      );
    }

    // Block inviting someone who already belongs to this org
    const existingMember = await this.prisma.membership.findFirst({
      where: {
        organizationId: inviter.organizationId,
        user: { email: dto.email },
      },
    });
    if (existingMember) {
      throw new ConflictException(
        'That person is already in your organization',
      );
    }

    // One live invite per email per org
    const pending = await this.prisma.invitation.findFirst({
      where: {
        organizationId: inviter.organizationId,
        email: dto.email,
        status: 'PENDING',
      },
    });
    if (pending) {
      throw new ConflictException('That email already has a pending invite');
    }

    // The secret goes to the invitee; only its hash is ever stored
    const rawToken = randomBytes(32).toString('hex');
    const invitation = await this.prisma.invitation.create({
      data: {
        email: dto.email,
        role: dto.role,
        tokenHash: this.tokens.hashToken(rawToken),
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        organizationId: inviter.organizationId,
        invitedById: inviter.sub,
      },
      select: { id: true, email: true, role: true, expiresAt: true },
    });

    return { ...invitation, token: rawToken };
  }

  // Pending invites for the caller's org only
  listPending(organizationId: string) {
    return this.prisma.invitation.findMany({
      where: { organizationId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  // Public redemption: turns a token into a user (if new) + a membership in the org
  async accept(rawToken: string, dto: AcceptInvitationDto) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash: this.tokens.hashToken(rawToken) },
    });
    if (!invitation || invitation.status !== 'PENDING') {
      throw new NotFoundException('Invite not found or already used');
    }
    if (invitation.expiresAt < new Date()) {
      // Record the lapse so the token can't be retried
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('This invite has expired');
    }

    const passwordHash = await this.passwords.hash(dto.password);

    // All-or-nothing: the user, the membership, and closing the invite move together
    return this.prisma.$transaction(async (tx) => {
      // Reuse an existing account for this email, otherwise create one
      let user = await tx.user.findUnique({
        where: { email: invitation.email },
      });
      if (!user) {
        user = await tx.user.create({
          data: { email: invitation.email, name: dto.name, passwordHash },
        });
      }

      // Guard the rare case where they already joined this org another way
      const already = await tx.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: invitation.organizationId,
          },
        },
      });
      if (already) {
        throw new ConflictException('You already belong to this organization');
      }

      await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      });

      return {
        organizationId: invitation.organizationId,
        role: invitation.role,
      };
    });
  }

  // OWNER/ADMIN cancels a still-pending invite in their org
  async revoke(organizationId: string, id: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id, organizationId },
    });
    if (!invitation) {
      throw new NotFoundException('Invite not found');
    }
    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('Only pending invites can be revoked');
    }
    await this.prisma.invitation.update({
      where: { id },
      data: { status: 'REVOKED' },
    });
    return { success: true };
  }
}
