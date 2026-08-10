import { IsEmail, IsIn } from 'class-validator';
import { Role } from '@prisma/client';

export class InviteDto {
  @IsEmail()
  email: string;

  // You can invite as ADMIN or MEMBER — never OWNER
  @IsIn([Role.ADMIN, Role.MEMBER])
  role: Role;
}
