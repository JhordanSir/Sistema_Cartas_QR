import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthApplicationService } from '../application/auth.service.js';
import { AUTH_APPLICATION } from '../auth.tokens.js';
import { AuthApplicationError } from '../domain/auth.errors.js';
import { IS_PUBLIC_KEY } from './auth.decorators.js';
import type { AuthenticatedRequest } from './auth-request.js';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    @Inject(AUTH_APPLICATION)
    private readonly auth: AuthApplicationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      request.auth = await this.auth.authenticateAccessToken(token);
      return true;
    } catch (error) {
      if (error instanceof AuthApplicationError) {
        throw new UnauthorizedException('Invalid or expired access token');
      }
      throw error;
    }
  }

  private extractBearerToken(
    authorization: string | string[] | undefined,
  ): string | null {
    if (typeof authorization !== 'string') {
      return null;
    }
    const match = /^Bearer ([^\s]+)$/i.exec(authorization);
    return match?.[1] ?? null;
  }
}
