import type { AuthRepository } from './ports/auth.repository.js';
import type { PasswordHasher } from './ports/security.ports.js';
import { InitialAdminBootstrap } from './initial-admin.bootstrap.js';
import { AuthRole } from '../domain/auth-role.js';

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

describe('InitialAdminBootstrap', () => {
  it('hashes the password and creates a normalized administrator once', async () => {
    const repository = createRepository();
    repository.findAccountByEmail.mockResolvedValue(null);
    repository.ensureAdmin.mockResolvedValue({
      email: 'admin@example.com',
      id: '22222222-2222-4222-8222-222222222222',
      isActive: true,
      passwordHash: 'hash',
      role: AuthRole.ADMIN,
    });
    const passwordHasher: jest.Mocked<PasswordHasher> = {
      hash: jest.fn().mockResolvedValue('hash'),
      verify: jest.fn(),
    };
    const bootstrap = new InitialAdminBootstrap(repository, passwordHasher);

    await expect(
      bootstrap.execute(' ADMIN@Example.com ', 'StrongPass-1'),
    ).resolves.toMatchObject({ created: true, email: 'admin@example.com' });
    expect(repository.ensureAdmin).toHaveBeenCalledWith(
      'admin@example.com',
      'hash',
    );
  });

  it('does not replace the password of an existing administrator', async () => {
    const repository = createRepository();
    repository.findAccountByEmail.mockResolvedValue({
      email: 'admin@example.com',
      id: '22222222-2222-4222-8222-222222222222',
      isActive: true,
      passwordHash: 'existing-hash',
      role: AuthRole.ADMIN,
    });
    const passwordHasher: jest.Mocked<PasswordHasher> = {
      hash: jest.fn(),
      verify: jest.fn(),
    };
    const bootstrap = new InitialAdminBootstrap(repository, passwordHasher);

    await expect(
      bootstrap.execute('admin@example.com', 'StrongPass-1'),
    ).resolves.toMatchObject({ created: false });
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(repository.ensureAdmin).not.toHaveBeenCalled();
  });

  it('refuses an initial password without an uppercase letter, a lowercase letter and a number', async () => {
    const repository = createRepository();
    const passwordHasher: jest.Mocked<PasswordHasher> = {
      hash: jest.fn(),
      verify: jest.fn(),
    };
    const bootstrap = new InitialAdminBootstrap(repository, passwordHasher);

    await expect(
      bootstrap.execute('admin@example.com', 'strong-password'),
    ).rejects.toMatchObject({ code: 'PASSWORD_POLICY' });
    expect(repository.findAccountByEmail).not.toHaveBeenCalled();
    expect(repository.ensureAdmin).not.toHaveBeenCalled();
  });
});
