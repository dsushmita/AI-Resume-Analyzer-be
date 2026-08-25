import { IsEmail, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateInvitationDto {
  @IsEmail()
  email!: string;

  // Which role the invitee receives once they accept
  @IsEnum(Role)
  role!: Role;
}
