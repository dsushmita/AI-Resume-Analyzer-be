import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from 'src/auth/auth.module';
import { InvitationsController } from './invitations.controller';

import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { InvitationsService } from './invitations.service';

@Module({
  imports: [JwtModule.register({}), AuthModule],
  controllers: [InvitationsController],
  providers: [InvitationsService, AccessTokenGuard, RolesGuard],
})
export class InvitationsModule {}
