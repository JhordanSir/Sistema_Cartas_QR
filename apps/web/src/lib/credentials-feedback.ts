import { isValidEmailFormat, meetsPasswordPolicy } from '@sirio/shared';

/**
 * Pure checks behind both login forms. They only decide what to tell the person;
 * whether a message stops the request is up to useCredentialsValidation.
 */
export function emailFormatError(value: string): string | null {
  return isValidEmailFormat(value.trim())
    ? null
    : 'Escribe un correo válido, por ejemplo nombre@dominio.com.';
}

export function passwordRequiredError(value: string): string | null {
  return value === '' ? 'Escribe tu contraseña.' : null;
}

/**
 * Advisory only: passwords issued before the complexity rule still verify on the
 * server, so a login can never be stuck here.
 */
export function passwordPolicyHint(value: string): string | null {
  return value === '' || meetsPasswordPolicy(value)
    ? null
    : 'Recomendamos mayúscula, minúscula y número. Si es tu contraseña actual, vuelve a pulsar para entrar.';
}
