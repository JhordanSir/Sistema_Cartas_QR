import { AuthRole } from '../../auth/domain/auth-role.js';
import type { AuthPrincipal } from '../../auth/domain/auth.types.js';
import { RestaurantApplicationError } from '../domain/restaurant.errors.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function assertAdministrator(principal: AuthPrincipal): void {
  if (principal.role !== AuthRole.ADMIN) {
    throw new RestaurantApplicationError(
      'FORBIDDEN',
      'Only administrators can manage restaurants',
    );
  }
}

export function normalizeRestaurantName(value: string): string {
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 160) {
    throw new RestaurantApplicationError(
      'INVALID_INPUT',
      'Restaurant name must contain between 2 and 160 characters',
    );
  }
  return name;
}

export function normalizeOwnerEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (email.length > 320 || !EMAIL_PATTERN.test(email)) {
    throw new RestaurantApplicationError(
      'INVALID_INPUT',
      'Owner email must be valid',
    );
  }
  return email;
}

export function assertInitialPassword(value: string): void {
  if (value.length < 8 || value.length > 128) {
    throw new RestaurantApplicationError(
      'INVALID_INPUT',
      'Initial password must contain between 8 and 128 characters',
    );
  }
}
