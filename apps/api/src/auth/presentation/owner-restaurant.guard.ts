import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { problemException } from '../../common/problem-exception.js';
import { AuthApplicationService } from '../application/auth.service.js';
import { AUTH_APPLICATION } from '../auth.tokens.js';
import type { AuthenticatedRequest } from './auth-request.js';

@Injectable()
export class OwnerRestaurantGuard implements CanActivate {
  constructor(
    @Inject(AUTH_APPLICATION)
    private readonly auth: AuthApplicationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.auth) {
      throw problemException(UnauthorizedException, 'Authentication required', {
        code: 'SESSION_EXPIRED',
      });
    }

    const restaurantId = request.params.restaurantId;
    if (!restaurantId) {
      throw problemException(ForbiddenException, 'Restaurant scope is required', {
        code: 'ACCESS_DENIED',
      });
    }

    const allowed = await this.auth.ownerCanAccessRestaurant(
      request.auth,
      restaurantId,
    );
    if (!allowed) {
      throw problemException(ForbiddenException, 'Restaurant access denied', {
        code: 'ACCESS_DENIED',
      });
    }
    return true;
  }
}
