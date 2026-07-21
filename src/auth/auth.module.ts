import { Module } from '@nestjs/common';
import { PasswordService } from './password.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController],
  providers: [PasswordService, AuthService],
  exports: [PasswordService],
})
export class AuthModule {}
