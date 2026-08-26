import { Argon2PasswordHasher } from './argon2-password.hasher.js';

describe('Argon2PasswordHasher', () => {
  const hasher = new Argon2PasswordHasher();

  it('stores an Argon2id hash and verifies the correct password', async () => {
    const passwordHash = await hasher.hash('strong-password');

    expect(passwordHash).toMatch(/^\$argon2id\$/);
    expect(passwordHash).not.toContain('strong-password');
    await expect(
      hasher.verify(passwordHash, 'strong-password'),
    ).resolves.toBe(true);
    await expect(hasher.verify(passwordHash, 'wrong-password')).resolves.toBe(
      false,
    );
  });

  it('rejects a malformed hash without leaking an infrastructure error', async () => {
    await expect(
      hasher.verify('not-an-argon2-hash', 'strong-password'),
    ).resolves.toBe(false);
  });
});
