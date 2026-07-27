import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

// Tags a route with the roles allowed to call it; the RolesGuard reads this back
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
