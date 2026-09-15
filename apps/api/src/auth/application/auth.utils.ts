import { meetsPasswordPolicy } from '@sirio/shared';

import { AuthApplicationError } from '../domain/auth.errors.js';

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

export function assertPasswordPolicy(password: string): void {
  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    throw new AuthApplicationError(
      'PASSWORD_POLICY',
      `Password must contain between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`,
    );
  }
  if (!meetsPasswordPolicy(password)) {
    throw new AuthApplicationError(
      'PASSWORD_POLICY',
      'Password must contain an uppercase letter, a lowercase letter and a number',
    );
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1_000);
}
