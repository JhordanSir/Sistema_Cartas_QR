import { randomInt } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { generateTemporaryPassword, TEMPORARY_PASSWORD_LENGTH } from './temporary-password';
import { validatePassword } from './validation';

describe('generateTemporaryPassword', () => {
  it('en 1000 generaciones siempre da 12 caracteres que cumplen la política de contraseñas', () => {
    const passwords = Array.from({ length: 1000 }, () => generateTemporaryPassword((max) => randomInt(max)));

    for (const password of passwords) {
      expect(password).toHaveLength(TEMPORARY_PASSWORD_LENGTH);
      expect(validatePassword(password)).toBeNull();
      expect(password).toMatch(/^[a-km-zA-HJ-NP-Z2-9]{12}$/);
    }
    // 1000 different passwords: nothing repeats by accident.
    expect(new Set(passwords).size).toBe(1000);
  });

  it('cumple la política incluso con el azar más pobre', () => {
    expect(validatePassword(generateTemporaryPassword(() => 0))).toBeNull();
    expect(validatePassword(generateTemporaryPassword((max) => max - 1))).toBeNull();
  });

  it('no usa caracteres que se confunden al dictarlos', () => {
    const sample = Array.from({ length: 200 }, () => generateTemporaryPassword((max) => randomInt(max))).join('');

    expect(sample).not.toMatch(/[0O1lI]/);
  });
});
