const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_POLICY_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;

/**
 * The shape the API already accepts for an owner email. Shared so the login forms
 * never reject a format the server would take, or accept one it would refuse.
 */
export function isValidEmailFormat(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

/**
 * Between 8 and 128 characters with at least one lowercase letter, one uppercase
 * letter and one digit. The server enforces it only when a password is set
 * (initial, change or reset); a login compares against the stored hash and never
 * re-validates, so passwords issued before this rule keep working.
 */
export function meetsPasswordPolicy(value: string): boolean {
  return PASSWORD_POLICY_PATTERN.test(value);
}
