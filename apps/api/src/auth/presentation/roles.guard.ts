import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AuthRole } from '../domain/auth-role.js';
import { ROLES_KEY } from './auth.decorators.js';
import type { AuthenticatedRequest } from './auth-request.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AuthRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const principal = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>().auth;
    if (!principal) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!requiredRoles.includes(principal.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
