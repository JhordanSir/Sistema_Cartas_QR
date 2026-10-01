import {
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  validateRestaurantName,
} from './validation';

// Form-level validation for the access and account screens. The browser runs it
// on submit and the Route Handlers run it again on the body they receive.

export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;

export type LoginValues = { email: string; password: string };

export type RegistrationMode = 'admin' | 'owner';
export type RegistrationValues = {
  restaurantName: string;
  email: string;
  password: string;
  passwordConfirmation: string;
};

export type PasswordChangeValues = {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirmation: string;
};

export const ACCOUNT_FORM_MESSAGES = {
  currentPasswordRequired: 'Escribe tu contraseña actual.',
  samePassword: 'La nueva contraseña debe ser distinta de la actual.',
} as const;

/** Drops the fields without an error, so an empty object means "valid". */
function compact<Field extends string>(errors: Record<Field, string | null>): FieldErrors<Field> {
  const result: FieldErrors<Field> = {};
  for (const [field, message] of Object.entries(errors) as [Field, string | null][]) {
    if (message) result[field] = message;
  }
  return result;
}

export function hasErrors(errors: FieldErrors<string>): boolean {
  return Object.keys(errors).length > 0;
}

export function validateLoginForm(values: LoginValues): FieldErrors<keyof LoginValues> {
  return compact({
    email: validateEmail(values.email),
    password: validatePassword(values.password),
  });
}

export function validateRegistrationForm(
  values: RegistrationValues,
  mode: RegistrationMode,
): FieldErrors<keyof RegistrationValues> {
  return compact({
    email: validateEmail(values.email),
    password: validatePassword(values.password),
    passwordConfirmation: validatePasswordConfirmation(values.password, values.passwordConfirmation),
    restaurantName: mode === 'owner' ? validateRestaurantName(values.restaurantName) : null,
  });
}

export function validatePasswordChangeForm(
  values: PasswordChangeValues,
): FieldErrors<keyof PasswordChangeValues> {
  const newPasswordError =
    validatePassword(values.newPassword) ??
    (values.newPassword === values.currentPassword ? ACCOUNT_FORM_MESSAGES.samePassword : null);
  return compact({
    currentPassword: values.currentPassword === '' ? ACCOUNT_FORM_MESSAGES.currentPasswordRequired : null,
    newPassword: newPasswordError,
    newPasswordConfirmation: validatePasswordConfirmation(
      values.newPassword,
      values.newPasswordConfirmation,
    ),
  });
}
