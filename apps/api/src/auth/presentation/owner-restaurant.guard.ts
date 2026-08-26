import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

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
      throw new UnauthorizedException('Authentication required');
    }

    const restaurantId = request.params.restaurantId;
    if (!restaurantId) {
      throw new ForbiddenException('Restaurant scope is required');
    }

    const allowed = await this.auth.ownerCanAccessRestaurant(
      request.auth,
      restaurantId,
    );
    if (!allowed) {
      throw new ForbiddenException('Restaurant access denied');
    }
    return true;
  }
}
