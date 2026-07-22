import { Module } from '@nestjs/common';
import { PasswordService } from './password.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { TokenService } from './token.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [PasswordService, AuthService, TokenService],
  exports: [PasswordService, TokenService],
})
export class AuthModule {}
