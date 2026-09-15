import { assertInitialPassword, normalizeOwnerEmail } from './restaurant.validation.js';

function thrownBy(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the action to throw');
}

describe('restaurant validation', () => {
  it('normalizes a valid owner email', () => {
    expect(normalizeOwnerEmail('  Hola@TuRestaurante.PE ')).toBe('hola@turestaurante.pe');
  });

  it.each([
    ['without @', 'turestaurante.pe'],
    ['without a dot in the domain', 'hola@turestaurante'],
    ['longer than 320 characters', `${'a'.repeat(310)}@dominio.pe`],
  ])('rejects an owner email %s', (_label, value) => {
    expect(thrownBy(() => normalizeOwnerEmail(value))).toMatchObject({
      code: 'INVALID_INPUT',
      message: 'Owner email must be valid',
    });
  });

  it('accepts an initial password with an uppercase letter, a lowercase letter and a number', () => {
    expect(() => assertInitialPassword('OwnerPass-1')).not.toThrow();
  });

  it.each([
    ['seven characters', 'Owner-1'],
    ['129 characters', `${'a'.repeat(127)}A1`],
  ])('rejects an initial password with %s by its length', (_label, value) => {
    expect(thrownBy(() => assertInitialPassword(value))).toMatchObject({
      code: 'INVALID_INPUT',
      message: 'Initial password must contain between 8 and 128 characters',
    });
  });

  it.each([
    ['no uppercase letter', 'ownerpass-1'],
    ['no lowercase letter', 'OWNERPASS-1'],
    ['no digit', 'OwnerPass-x'],
  ])('rejects an initial password with %s by its composition', (_label, value) => {
    expect(thrownBy(() => assertInitialPassword(value))).toMatchObject({
      code: 'INVALID_INPUT',
      message: 'Initial password must contain an uppercase letter, a lowercase letter and a number',
    });
  });
});
