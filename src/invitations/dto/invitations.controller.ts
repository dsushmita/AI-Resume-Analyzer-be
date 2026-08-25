import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { InvitationsService } from '../invitations.service';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { CreateInvitationDto } from './create-invitation.dto';
import type { AccessTokenPayload } from 'src/auth/token.service';
import { AcceptInvitationDto } from './accept-invitation.dto';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  // Managers invite; a MEMBER hitting this gets 403 from RolesGuard
  @Post()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  create(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitations.create(user, dto);
  }

  @Get()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.invitations.listPending(user.organizationId);
  }

  // Public — the invitee has no account or session yet
  @Post(':token/accept')
  @HttpCode(200)
  accept(@Param('token') token: string, @Body() dto: AcceptInvitationDto) {
    return this.invitations.accept(token, dto);
  }

  @Post(':id/revoke')
  @HttpCode(200)
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  revoke(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.invitations.revoke(user.organizationId, id);
  }
}
