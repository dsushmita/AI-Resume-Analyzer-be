import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RequestWithUser } from './access-token.guard';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Read the roles the route requires (from method first, then class)
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles on the route → any authenticated user may pass
    if (!required || required.length === 0) {
      return true;
    }

    const user = context.switchToHttp().getRequest<RequestWithUser>().user;
    if (!user || !required.includes(user.role as Role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
