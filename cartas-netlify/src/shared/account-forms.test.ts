import { describe, expect, it } from 'vitest';

import {
  ACCOUNT_FORM_MESSAGES,
  hasErrors,
  validateLoginForm,
  validatePasswordChangeForm,
  validateRegistrationForm,
} from './account-forms';
import { VALIDATION_MESSAGES } from './validation';

const validOwner = {
  email: 'ana@mail.com',
  password: 'Ñandú2024',
  passwordConfirmation: 'Ñandú2024',
  restaurantName: 'Cevichería Luna',
};

describe('validateLoginForm', () => {
  it('no marca nada con datos válidos', () => {
    expect(validateLoginForm({ email: 'ana@mail.com', password: 'Secreta2026' })).toEqual({});
  });

  it('aplica la política de contraseña también al entrar', () => {
    expect(validateLoginForm({ email: 'hola@turestaurante', password: 'clave' })).toEqual({
      email: VALIDATION_MESSAGES.email,
      password: VALIDATION_MESSAGES.password,
    });
  });
});

describe('validateRegistrationForm', () => {
  it('acepta un dueño completo', () => {
    expect(hasErrors(validateRegistrationForm(validOwner, 'owner'))).toBe(false);
  });

  it('pide el nombre del restaurante solo al dueño', () => {
    const withoutName = { ...validOwner, restaurantName: '' };

    expect(validateRegistrationForm(withoutName, 'owner')).toEqual({
      restaurantName: VALIDATION_MESSAGES.restaurantName,
    });
    expect(validateRegistrationForm(withoutName, 'admin')).toEqual({});
  });

  it('marca la repetición cuando no coincide', () => {
    expect(
      validateRegistrationForm({ ...validOwner, passwordConfirmation: 'Ñandú2025' }, 'owner'),
    ).toEqual({ passwordConfirmation: VALIDATION_MESSAGES.passwordMismatch });
  });
});

describe('validatePasswordChangeForm', () => {
  const valid = {
    currentPassword: 'Secreta2026',
    newPassword: 'Ñandú2024',
    newPasswordConfirmation: 'Ñandú2024',
  };

  it('acepta un cambio válido', () => {
    expect(validatePasswordChangeForm(valid)).toEqual({});
  });

  it('pide la contraseña actual', () => {
    expect(validatePasswordChangeForm({ ...valid, currentPassword: '' })).toEqual({
      currentPassword: ACCOUNT_FORM_MESSAGES.currentPasswordRequired,
    });
  });

  it('exige que la nueva cumpla la política y sea distinta de la actual', () => {
    expect(
      validatePasswordChangeForm({ ...valid, newPassword: 'clave', newPasswordConfirmation: 'clave' }),
    ).toEqual({ newPassword: VALIDATION_MESSAGES.password });
    expect(
      validatePasswordChangeForm({
        ...valid,
        newPassword: 'Secreta2026',
        newPasswordConfirmation: 'Secreta2026',
      }),
    ).toEqual({ newPassword: ACCOUNT_FORM_MESSAGES.samePassword });
  });
});
