import { randomBytes } from 'node:crypto';

import { argon2id, argon2Verify } from 'hash-wasm';

// Argon2id with the parameters of §E4. hash-wasm instead of @node-rs/argon2:
// see PROGRESS.md. Both produce and read the same PHC strings
// ($argon2id$v=19$m=19456,t=2,p=1$…), so stored hashes stay valid either way.
const ARGON2_PARAMETERS = {
  hashLength: 32,
  iterations: 2,
  memorySize: 19_456,
  parallelism: 1,
} as const;

/** The same password typed with composed or decomposed accents must match. */
function normalize(password: string): string {
  return password.normalize('NFC');
}

export async function hashPassword(password: string): Promise<string> {
  return argon2id({
    ...ARGON2_PARAMETERS,
    outputType: 'encoded',
    password: normalize(password),
    salt: randomBytes(16),
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2Verify({ hash, password: normalize(password) });
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | undefined;

/**
 * Spends the same time as a real verification when the email does not exist,
 * so response times do not reveal which emails have an account.
 */
export async function verifyAgainstDummyHash(password: string): Promise<void> {
  dummyHash ??= hashPassword('Dummy-password-0');
  await verifyPassword(password, await dummyHash);
}
