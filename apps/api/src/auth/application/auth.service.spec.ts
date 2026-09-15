import type { AuthRepository } from './ports/auth.repository.js';
import type {
  Clock,
  IdentifierGenerator,
  PasswordHasher,
  SecretDigester,
  TokenService,
} from './ports/security.ports.js';
import { AuthApplicationService } from './auth.service.js';
import { AuthRole } from '../domain/auth-role.js';
import type {
  AuthAccount,
  AuthPrincipal,
  IssuedTokenPair,
  TokenSubject,
} from '../domain/auth.types.js';

const NOW = new Date('2026-08-26T17:00:00.000Z');
const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const ADMIN_ID = '22222222-2222-4222-8222-222222222222';
const SESSION_ID = '33333333-3333-4333-8333-333333333333';

const OWNER_ACCOUNT: AuthAccount = {
  email: 'owner@example.com',
  id: OWNER_ID,
  isActive: true,
  passwordHash: 'owner-hash',
  role: AuthRole.OWNER,
};
const ADMIN_PRINCIPAL: AuthPrincipal = {
  accountId: ADMIN_ID,
  email: 'admin@example.com',
  role: AuthRole.ADMIN,
  sessionId: SESSION_ID,
};
const OWNER_PRINCIPAL: AuthPrincipal = {
  accountId: OWNER_ID,
  email: OWNER_ACCOUNT.email,
  role: AuthRole.OWNER,
  sessionId: SESSION_ID,
};
const TOKENS: IssuedTokenPair = {
  accessExpiresIn: 900,
  accessToken: 'access-token',
  refreshExpiresIn: 604_800,
  refreshToken: 'refresh-token-new',
};
const SUBJECT: TokenSubject = {
  accountId: OWNER_ID,
  role: AuthRole.OWNER,
  sessionId: SESSION_ID,
};

function createRepository(): jest.Mocked<AuthRepository> {
  return {
    createSession: jest.fn(),
    ensureAdmin: jest.fn(),
    findAccountByEmail: jest.fn(),
    findAccountById: jest.fn(),
    findActivePrincipal: jest.fn(),
    ownerHasRestaurant: jest.fn(),
    replacePasswordAndRevokeSessions: jest.fn(),
    revokeSession: jest.fn(),
    revokeSessionByDigest: jest.fn(),
    rotateSession: jest.fn(),
  };
}

describe('AuthApplicationService', () => {
  let repository: jest.Mocked<AuthRepository>;
  let passwordHasher: jest.Mocked<PasswordHasher>;
  let tokenService: jest.Mocked<TokenService>;
  let service: AuthApplicationService;

  beforeEach(() => {
    repository = createRepository();
    passwordHasher = {
      hash: jest.fn().mockResolvedValue('new-hash'),
      verify: jest.fn().mockResolvedValue(true),
    };
    tokenService = {
      issueTokenPair: jest.fn().mockResolvedValue(TOKENS),
      verifyAccessToken: jest.fn().mockResolvedValue(SUBJECT),
      verifyRefreshToken: jest.fn().mockResolvedValue(SUBJECT),
    };
    const digester: SecretDigester = {
      digest: (value) => `digest:${value}`,
    };
    const identifiers: IdentifierGenerator = {
      generate: () => SESSION_ID,
    };
    const clock: Clock = { now: () => new Date(NOW) };
    service = new AuthApplicationService(
      repository,
      passwordHasher,
      tokenService,
      digester,
      identifiers,
      clock,
    );
  });

  it('logs in an active owner and persists a refresh session', async () => {
    repository.findAccountByEmail.mockResolvedValue(OWNER_ACCOUNT);

    await expect(
      service.login({
        email: ' OWNER@Example.com ',
        password: 'current-password',
        role: AuthRole.OWNER,
      }),
    ).resolves.toMatchObject({
      accessToken: TOKENS.accessToken,
      principal: {
        accountId: OWNER_ID,
        email: OWNER_ACCOUNT.email,
        role: AuthRole.OWNER,
      },
      refreshToken: TOKENS.refreshToken,
      tokenType: 'Bearer',
    });

    expect(repository.findAccountByEmail).toHaveBeenCalledWith(
      OWNER_ACCOUNT.email,
      AuthRole.OWNER,
    );
    expect(repository.createSession).toHaveBeenCalledWith({
      accountId: OWNER_ID,
      expiresAt: new Date('2026-09-02T17:00:00.000Z'),
      id: SESSION_ID,
      refreshTokenDigest: `digest:${TOKENS.refreshToken}`,
      role: AuthRole.OWNER,
    });
  });

  it('returns the same error for a missing account and performs costly work', async () => {
    repository.findAccountByEmail.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'missing@example.com',
        password: 'unknown-password',
        role: AuthRole.OWNER,
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    expect(passwordHasher.hash).toHaveBeenCalledWith('unknown-password');
  });

  it('rejects an incorrect password', async () => {
    repository.findAccountByEmail.mockResolvedValue(OWNER_ACCOUNT);
    passwordHasher.verify.mockResolvedValue(false);

    await expect(
      service.login({
        email: OWNER_ACCOUNT.email,
        password: 'wrong-password',
        role: AuthRole.OWNER,
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('rotates a valid refresh token atomically', async () => {
    repository.findActivePrincipal.mockResolvedValue(OWNER_PRINCIPAL);
    repository.rotateSession.mockResolvedValue(true);

    await expect(service.refresh('refresh-token-old')).resolves.toMatchObject({
      accessToken: TOKENS.accessToken,
      refreshToken: TOKENS.refreshToken,
    });
    expect(repository.rotateSession).toHaveBeenCalledWith({
      currentDigest: 'digest:refresh-token-old',
      expiresAt: new Date('2026-09-02T17:00:00.000Z'),
      id: SESSION_ID,
      newDigest: `digest:${TOKENS.refreshToken}`,
      now: NOW,
    });
  });

  it('revokes the session when an old refresh token is replayed', async () => {
    repository.findActivePrincipal.mockResolvedValue(OWNER_PRINCIPAL);
    repository.rotateSession.mockResolvedValue(false);

    await expect(service.refresh('replayed-token')).rejects.toMatchObject({
      code: 'INVALID_TOKEN',
    });
    expect(repository.revokeSession).toHaveBeenCalledWith(SESSION_ID, NOW);
  });

  it('validates the persisted session for every access token', async () => {
    repository.findActivePrincipal.mockResolvedValue(OWNER_PRINCIPAL);

    await expect(
      service.authenticateAccessToken('access-token'),
    ).resolves.toEqual(OWNER_PRINCIPAL);
    expect(repository.findActivePrincipal).toHaveBeenCalledWith(
      SESSION_ID,
      OWNER_ID,
      AuthRole.OWNER,
      NOW,
    );
  });

  it('changes the owner password and revokes all active sessions', async () => {
    repository.findAccountById.mockResolvedValue(OWNER_ACCOUNT);

    await service.changeOwnPassword({
      currentPassword: 'current-password',
      newPassword: 'NewPass-1',
      principal: OWNER_PRINCIPAL,
    });

    expect(repository.replacePasswordAndRevokeSessions).toHaveBeenCalledWith(
      OWNER_ID,
      AuthRole.OWNER,
      'new-hash',
      NOW,
    );
  });

  it('allows an administrator to rotate the bootstrap password', async () => {
    repository.findAccountById.mockResolvedValue({
      email: ADMIN_PRINCIPAL.email,
      id: ADMIN_ID,
      isActive: true,
      passwordHash: 'admin-hash',
      role: AuthRole.ADMIN,
    });

    await service.changeOwnPassword({
      currentPassword: 'bootstrap-password',
      newPassword: 'RotatedPass-1',
      principal: ADMIN_PRINCIPAL,
    });

    expect(repository.replacePasswordAndRevokeSessions).toHaveBeenCalledWith(
      ADMIN_ID,
      AuthRole.ADMIN,
      'new-hash',
      NOW,
    );
  });

  it('rejects the wrong current password without updating data', async () => {
    repository.findAccountById.mockResolvedValue(OWNER_ACCOUNT);
    passwordHasher.verify.mockResolvedValue(false);

    await expect(
      service.changeOwnPassword({
        currentPassword: 'wrong-password',
        newPassword: 'NewPass-1',
        principal: OWNER_PRINCIPAL,
      }),
    ).rejects.toMatchObject({ code: 'CURRENT_PASSWORD_INVALID' });
    expect(repository.replacePasswordAndRevokeSessions).not.toHaveBeenCalled();
  });

  it('enforces the password length in the application boundary', async () => {
    await expect(
      service.changeOwnPassword({
        currentPassword: 'current-password',
        newPassword: 'short',
        principal: OWNER_PRINCIPAL,
      }),
    ).rejects.toMatchObject({ code: 'PASSWORD_POLICY' });
  });

  it.each([
    ['no uppercase letter', 'newpass-1'],
    ['no lowercase letter', 'NEWPASS-1'],
    ['no digit', 'NewPass-x'],
  ])('rejects a new password with %s', async (_label, newPassword) => {
    repository.findAccountById.mockResolvedValue(OWNER_ACCOUNT);

    await expect(
      service.changeOwnPassword({
        currentPassword: 'current-password',
        newPassword,
        principal: OWNER_PRINCIPAL,
      }),
    ).rejects.toMatchObject({
      code: 'PASSWORD_POLICY',
      message: 'Password must contain an uppercase letter, a lowercase letter and a number',
    });
    expect(repository.replacePasswordAndRevokeSessions).not.toHaveBeenCalled();
  });

  it('allows only an administrator to reset an owner password', async () => {
    repository.findAccountById.mockResolvedValue(OWNER_ACCOUNT);

    await service.resetOwnerPassword({
      newPassword: 'ResetPass-1',
      ownerId: OWNER_ID,
      principal: ADMIN_PRINCIPAL,
    });
    expect(repository.replacePasswordAndRevokeSessions).toHaveBeenCalledWith(
      OWNER_ID,
      AuthRole.OWNER,
      'new-hash',
      NOW,
    );

    await expect(
      service.resetOwnerPassword({
        newPassword: 'ResetPass-1',
        ownerId: OWNER_ID,
        principal: OWNER_PRINCIPAL,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('checks restaurant ownership through the repository port', async () => {
    repository.ownerHasRestaurant.mockResolvedValue(true);

    await expect(
      service.ownerCanAccessRestaurant(
        OWNER_PRINCIPAL,
        '44444444-4444-4444-8444-444444444444',
      ),
    ).resolves.toBe(true);
    await expect(
      service.ownerCanAccessRestaurant(
        ADMIN_PRINCIPAL,
        '44444444-4444-4444-8444-444444444444',
      ),
    ).resolves.toBe(false);
  });
});
