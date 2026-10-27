import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { problemException } from '../../common/problem-exception.js';
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
      throw problemException(UnauthorizedException, 'Authentication required', {
        code: 'SESSION_EXPIRED',
      });
    }
    if (!requiredRoles.includes(principal.role)) {
      throw problemException(ForbiddenException, 'Insufficient permissions', {
        code: 'ACCESS_DENIED',
      });
    }

    return true;
  }
}
