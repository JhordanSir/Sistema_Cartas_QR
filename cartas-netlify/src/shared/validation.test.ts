import { describe, expect, it } from 'vitest';

import {
  collapseWhitespace,
  normalizeEmail,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  validateRestaurantName,
  VALIDATION_MESSAGES,
} from './validation';

describe('validateEmail', () => {
  it.each(['ana@mail.com', '  Ana@Mail.COM  ', 'mesa.7+reservas@cevicheria-luna.pe'])(
    'acepta «%s»',
    (email) => {
      expect(validateEmail(email)).toBeNull();
    },
  );

  it.each(['hola@turestaurante', 'ana@', '@mail.com', 'ana mail@mail.com', 'ana@mail .com', ''])(
    'rechaza «%s»',
    (email) => {
      expect(validateEmail(email)).toBe(VALIDATION_MESSAGES.email);
    },
  );

  it('rechaza un correo de más de 320 caracteres', () => {
    expect(validateEmail(`${'a'.repeat(310)}@mail.com.pe`)).toBe(VALIDATION_MESSAGES.email);
  });

  it('normaliza a minúsculas y sin espacios en los extremos', () => {
    expect(normalizeEmail('  Ana@Mail.COM ')).toBe('ana@mail.com');
  });
});

describe('validatePassword', () => {
  it.each(['Ñandú2024', 'Secreta2026', 'ÁRBOLes٣'])('acepta «%s»', (password) => {
    expect(validatePassword(password)).toBeNull();
  });

  it.each([
    ['clave', 'corta y sin mayúscula ni número'],
    ['CLAVE2024', 'sin minúscula'],
    ['clave2024', 'sin mayúscula'],
    ['ClaveSegura', 'sin número'],
    ['Ab1', 'menos de 8 caracteres'],
  ])('rechaza «%s» (%s)', (password) => {
    expect(validatePassword(password)).toBe(VALIDATION_MESSAGES.password);
  });

  it('cuenta caracteres, no unidades UTF-16', () => {
    // 7 caracteres visibles, pero 8 unidades UTF-16 por el emoji.
    expect(validatePassword('Ab1cde😀')).toBe(VALIDATION_MESSAGES.password);
    expect(validatePassword(`Ab1${'x'.repeat(125)}`)).toBeNull();
    expect(validatePassword(`Ab1${'x'.repeat(126)}`)).toBe(VALIDATION_MESSAGES.password);
  });
});

describe('validatePasswordConfirmation', () => {
  it('exige que las dos contraseñas coincidan', () => {
    expect(validatePasswordConfirmation('Secreta2026', 'Secreta2026')).toBeNull();
    expect(validatePasswordConfirmation('Secreta2026', 'secreta2026')).toBe(
      VALIDATION_MESSAGES.passwordMismatch,
    );
  });
});

describe('validateRestaurantName', () => {
  it('acepta un nombre con acentos y espacios repetidos', () => {
    expect(validateRestaurantName('  Cevichería   Luna ')).toBeNull();
    expect(collapseWhitespace('  Cevichería   Luna ')).toBe('Cevichería Luna');
  });

  it('rechaza un nombre vacío o de más de 160 caracteres', () => {
    expect(validateRestaurantName('   ')).toBe(VALIDATION_MESSAGES.restaurantName);
    expect(validateRestaurantName('a'.repeat(161))).toBe(VALIDATION_MESSAGES.restaurantName);
    expect(validateRestaurantName('a'.repeat(160))).toBeNull();
  });

  it('rechaza un nombre que no produce un slug', () => {
    expect(validateRestaurantName('¡¡!!')).toBe(VALIDATION_MESSAGES.restaurantNameWithoutLetters);
  });
});
