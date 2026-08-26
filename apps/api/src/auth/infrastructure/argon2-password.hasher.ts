import { argon2id, hash, verify } from 'argon2';

import type { PasswordHasher } from '../application/ports/security.ports.js';

const ARGON2_MEMORY_COST_KIB = 19_456;
const ARGON2_TIME_COST = 2;
const ARGON2_PARALLELISM = 1;

export class Argon2PasswordHasher implements PasswordHasher {
  hash(value: string): Promise<string> {
    return hash(value, {
      memoryCost: ARGON2_MEMORY_COST_KIB,
      parallelism: ARGON2_PARALLELISM,
      timeCost: ARGON2_TIME_COST,
      type: argon2id,
    });
  }

  async verify(passwordHash: string, value: string): Promise<boolean> {
    try {
      return await verify(passwordHash, value);
    } catch {
      return false;
    }
  }
}
