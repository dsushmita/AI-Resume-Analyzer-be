import { Module } from '@nestjs/common';
import { PasswordService } from './password.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { TokenService } from './token.service';
import { AccessTokenGuard } from './guards/access-token.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [PasswordService, AuthService, AccessTokenGuard, TokenService],
  exports: [PasswordService, TokenService],
})
export class AuthModule {}
