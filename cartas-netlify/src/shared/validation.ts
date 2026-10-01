import { normalizeSlug } from './slug';

// Validation rules of docs/ESPECIFICACION.md §E5, shared by the browser and
// the server. Each validator returns the message to show, or null when valid.

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const EMAIL_MAX_LENGTH = 320;

/** At least one lowercase letter, one uppercase letter and one digit, in any script. */
export const PASSWORD_PATTERN = /^(?=.*\p{Ll})(?=.*\p{Lu})(?=.*\p{Nd})/su;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const RESTAURANT_NAME_MAX_LENGTH = 160;

export const VALIDATION_MESSAGES = {
  email: 'Escribe un correo válido, por ejemplo nombre@dominio.com.',
  password:
    'La contraseña debe tener entre 8 y 128 caracteres, con una mayúscula, una minúscula y un número.',
  passwordMismatch: 'Las contraseñas no coinciden.',
  passwordRequired: 'Escribe tu contraseña.',
  restaurantName: 'Escribe el nombre del restaurante, de hasta 160 caracteres.',
  restaurantNameWithoutLetters: 'El nombre del restaurante debe tener al menos una letra o un número.',
} as const;

/** Counts characters as the user sees them, not UTF-16 code units. */
function characterCount(value: string): number {
  return [...value].length;
}

/** Collapses every run of whitespace into one space and trims the ends. */
export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/gu, ' ').trim();
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateEmail(value: string): string | null {
  const email = normalizeEmail(value);
  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
    return VALIDATION_MESSAGES.email;
  }
  return null;
}

export function validatePassword(value: string): string | null {
  const length = characterCount(value);
  if (length < PASSWORD_MIN_LENGTH || length > PASSWORD_MAX_LENGTH || !PASSWORD_PATTERN.test(value)) {
    return VALIDATION_MESSAGES.password;
  }
  return null;
}

export function validatePasswordConfirmation(password: string, confirmation: string): string | null {
  return password === confirmation ? null : VALIDATION_MESSAGES.passwordMismatch;
}

export function validateRestaurantName(value: string): string | null {
  const name = collapseWhitespace(value);
  const length = characterCount(name);
  if (length < 1 || length > RESTAURANT_NAME_MAX_LENGTH) {
    return VALIDATION_MESSAGES.restaurantName;
  }
  if (normalizeSlug(name) === '') {
    return VALIDATION_MESSAGES.restaurantNameWithoutLetters;
  }
  return null;
}
