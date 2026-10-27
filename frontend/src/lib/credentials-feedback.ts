import { isValidEmailFormat, meetsPasswordPolicy } from '@sirio/shared';

/** Keys into the login copy, so a message follows the language it is shown in. */
export type CredentialsMessage = 'emailFormat' | 'passwordPolicy' | 'passwordRequired';

/**
 * Pure checks behind both login forms. They only decide what to tell the person;
 * whether a message stops the request is up to useCredentialsValidation.
 */
export function emailFormatError(value: string): CredentialsMessage | null {
  return isValidEmailFormat(value.trim()) ? null : 'emailFormat';
}

export function passwordRequiredError(value: string): CredentialsMessage | null {
  return value === '' ? 'passwordRequired' : null;
}

/**
 * Advisory only: passwords issued before the complexity rule still verify on the
 * server, so a login can never be stuck here.
 */
export function passwordPolicyHint(value: string): CredentialsMessage | null {
  return value === '' || meetsPasswordPolicy(value) ? null : 'passwordPolicy';
}
