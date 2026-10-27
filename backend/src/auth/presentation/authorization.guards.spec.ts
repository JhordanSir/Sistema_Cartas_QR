import type { ExecutionContext, HttpException } from '@nestjs/common';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';

import type { AuthApplicationService } from '../application/auth.service.js';
import { AuthApplicationError } from '../domain/auth.errors.js';
import { AuthRole } from '../domain/auth-role.js';
import type { AuthPrincipal } from '../domain/auth.types.js';
import type { AuthenticatedRequest } from './auth-request.js';
import { AccessTokenGuard } from './access-token.guard.js';
import { OwnerRestaurantGuard } from './owner-restaurant.guard.js';
import { RolesGuard } from './roles.guard.js';

const OWNER: AuthPrincipal = {
  accountId: '11111111-1111-4111-8111-111111111111',
  email: 'owner@example.com',
  role: AuthRole.OWNER,
  sessionId: '33333333-3333-4333-8333-333333333333',
};
const ADMIN: AuthPrincipal = {
  ...OWNER,
  accountId: '22222222-2222-4222-8222-222222222222',
  email: 'admin@example.com',
  role: AuthRole.ADMIN,
};

function createContext(request: Partial<AuthenticatedRequest>): ExecutionContext {
  return {
    getClass: () => class TestController {},
    getHandler: () => (): void => undefined,
    getType: () => 'http',
    getArgs: () => [],
    getArgByIndex: () => undefined,
    switchToHttp: () => ({
      getNext: () => undefined,
      getRequest: () => request,
      getResponse: () => undefined,
    }),
    switchToRpc: () => ({
      getContext: () => undefined,
      getData: () => undefined,
    }),
    switchToWs: () => ({
      getClient: () => undefined,
      getData: () => undefined,
      getPattern: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

describe('AccessTokenGuard', () => {
  it('allows explicitly public routes without a token', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(true),
    } as unknown as Reflector;
    const auth = {
      authenticateAccessToken: jest.fn(),
    } as unknown as AuthApplicationService;
    const guard = new AccessTokenGuard(reflector, auth);

    await expect(guard.canActivate(createContext({ headers: {} }))).resolves.toBe(
      true,
    );
  });

  it('authenticates a bearer token and attaches the principal', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const auth = {
      authenticateAccessToken: jest.fn().mockResolvedValue(OWNER),
    } as unknown as AuthApplicationService;
    const guard = new AccessTokenGuard(reflector, auth);
    const request: Partial<AuthenticatedRequest> = {
      headers: { authorization: 'Bearer access-token' },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.auth).toEqual(OWNER);
  });

  it('denies missing and invalid access tokens', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const auth = {
      authenticateAccessToken: jest
        .fn()
        .mockRejectedValue(
          new AuthApplicationError('INVALID_TOKEN', 'invalid'),
        ),
    } as unknown as AuthApplicationService;
    const guard = new AccessTokenGuard(reflector, auth);

    await expect(
      guard.canActivate(createContext({ headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      guard.canActivate(
        createContext({ headers: { authorization: 'Bearer invalid' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('does not hide infrastructure failures as authentication errors', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const databaseError = new Error('database unavailable');
    const auth = {
      authenticateAccessToken: jest.fn().mockRejectedValue(databaseError),
    } as unknown as AuthApplicationService;
    const guard = new AccessTokenGuard(reflector, auth);

    await expect(
      guard.canActivate(
        createContext({ headers: { authorization: 'Bearer valid-shape' } }),
      ),
    ).rejects.toBe(databaseError);
  });
});

describe('RolesGuard', () => {
  it('allows a principal with an accepted role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([AuthRole.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext({ auth: ADMIN }))).toBe(true);
  });

  it('denies the wrong role and unauthenticated requests', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([AuthRole.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(createContext({ auth: OWNER }))).toThrow(
      ForbiddenException,
    );
    expect(() => guard.canActivate(createContext({}))).toThrow(
      UnauthorizedException,
    );
  });
});

describe('OwnerRestaurantGuard', () => {
  it('allows only an owner associated with the route restaurant', async () => {
    const auth = {
      ownerCanAccessRestaurant: jest.fn().mockResolvedValue(true),
    } as unknown as AuthApplicationService;
    const guard = new OwnerRestaurantGuard(auth);
    const context = createContext({
      auth: OWNER,
      params: { restaurantId: '44444444-4444-4444-8444-444444444444' },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(auth.ownerCanAccessRestaurant).toHaveBeenCalledWith(
      OWNER,
      '44444444-4444-4444-8444-444444444444',
    );
  });

  it('denies a principal without ownership', async () => {
    const auth = {
      ownerCanAccessRestaurant: jest.fn().mockResolvedValue(false),
    } as unknown as AuthApplicationService;
    const guard = new OwnerRestaurantGuard(auth);
    const context = createContext({
      auth: OWNER,
      params: { restaurantId: '44444444-4444-4444-8444-444444444444' },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('denies an owner route without a restaurant scope before checking ownership', async () => {
    const auth = {
      ownerCanAccessRestaurant: jest.fn(),
    } as unknown as AuthApplicationService;
    const guard = new OwnerRestaurantGuard(auth);

    await expect(
      guard.canActivate(createContext({ auth: OWNER, params: {} })),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(auth.ownerCanAccessRestaurant).not.toHaveBeenCalled();
  });
});

describe('guard refusals', () => {
  it('carry the code the web translates', async () => {
    const onlyAdmins = {
      getAllAndOverride: jest.fn().mockReturnValue([AuthRole.ADMIN]),
    } as unknown as Reflector;
    const privateRoute = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const auth = {
      authenticateAccessToken: jest
        .fn()
        .mockRejectedValue(new AuthApplicationError('INVALID_TOKEN', 'invalid')),
      ownerCanAccessRestaurant: jest.fn().mockResolvedValue(false),
    } as unknown as AuthApplicationService;
    const scoped = { params: { restaurantId: '44444444-4444-4444-8444-444444444444' } };

    await expect(
      codeOf(() => new AccessTokenGuard(privateRoute, auth).canActivate(createContext({ headers: {} }))),
    ).resolves.toBe('SESSION_EXPIRED');
    await expect(
      codeOf(() =>
        new AccessTokenGuard(privateRoute, auth).canActivate(
          createContext({ headers: { authorization: 'Bearer invalid' } }),
        ),
      ),
    ).resolves.toBe('SESSION_EXPIRED');
    await expect(
      codeOf(() => new RolesGuard(onlyAdmins).canActivate(createContext({}))),
    ).resolves.toBe('SESSION_EXPIRED');
    await expect(
      codeOf(() => new RolesGuard(onlyAdmins).canActivate(createContext({ auth: OWNER }))),
    ).resolves.toBe('ACCESS_DENIED');
    await expect(
      codeOf(() => new OwnerRestaurantGuard(auth).canActivate(createContext(scoped))),
    ).resolves.toBe('SESSION_EXPIRED');
    await expect(
      codeOf(() =>
        new OwnerRestaurantGuard(auth).canActivate(createContext({ auth: OWNER, params: {} })),
      ),
    ).resolves.toBe('ACCESS_DENIED');
    await expect(
      codeOf(() =>
        new OwnerRestaurantGuard(auth).canActivate(createContext({ ...scoped, auth: OWNER })),
      ),
    ).resolves.toBe('ACCESS_DENIED');
  });
});

async function codeOf(run: () => unknown): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return ((error as HttpException).getResponse() as { code?: unknown }).code;
  }
  throw new Error('Expected the guard to refuse');
}
