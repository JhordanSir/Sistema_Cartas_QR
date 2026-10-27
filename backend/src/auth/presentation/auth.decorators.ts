import {
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
} from '@nestjs/common';

import type { AuthRole } from '../domain/auth-role.js';
import type { AuthPrincipal } from '../domain/auth.types.js';
import type { AuthenticatedRequest } from './auth-request.js';

export const IS_PUBLIC_KEY = 'auth:is-public';
export const ROLES_KEY = 'auth:roles';

export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);

export const Roles = (...roles: AuthRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthPrincipal => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.auth) {
      throw new Error('Authenticated principal is unavailable');
    }
    return request.auth;
  },
);
