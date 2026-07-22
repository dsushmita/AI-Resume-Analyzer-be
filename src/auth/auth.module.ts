import { Module } from '@nestjs/common';
import { PasswordService } from './password.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [PasswordService, AuthService],
  exports: [PasswordService],
})
export class AuthModule {}
