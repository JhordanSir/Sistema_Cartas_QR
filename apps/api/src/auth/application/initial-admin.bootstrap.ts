import { AuthRole } from '../domain/auth-role.js';
import type { AuthRepository } from './ports/auth.repository.js';
import type { PasswordHasher } from './ports/security.ports.js';
import { assertPasswordPolicy, normalizeEmail } from './auth.utils.js';

export interface InitialAdminResult {
  created: boolean;
  email: string;
  id: string;
}

export class InitialAdminBootstrap {
  constructor(
    private readonly repository: AuthRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(email: string, password: string): Promise<InitialAdminResult> {
    const normalizedEmail = normalizeEmail(email);
    assertPasswordPolicy(password);

    const existing = await this.repository.findAccountByEmail(
      normalizedEmail,
      AuthRole.ADMIN,
    );
    if (existing) {
      return {
        created: false,
        email: existing.email,
        id: existing.id,
      };
    }

    const passwordHash = await this.passwordHasher.hash(password);
    const admin = await this.repository.ensureAdmin(
      normalizedEmail,
      passwordHash,
    );

    return {
      created: true,
      email: admin.email,
      id: admin.id,
    };
  }
}
