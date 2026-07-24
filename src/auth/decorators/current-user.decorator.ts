import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AccessTokenPayload } from '../token.service';
import { RequestWithUser } from '../guards/access-token.guard';

// Pulls the verified user off the request so routes can just ask for @CurrentUser()
export const CurrentUser = createParamDecorator(
  (
    _data: unknown,
    context: ExecutionContext,
  ): AccessTokenPayload | undefined => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
