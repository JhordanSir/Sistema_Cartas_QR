const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Unicode letter and digit classes, so "Ñandú2024" counts its Ñ as the uppercase letter.
// The s flag lets the lookaheads cross a line break inside a pasted password.
const PASSWORD_POLICY_PATTERN = /^(?=.*\p{Ll})(?=.*\p{Lu})(?=.*\p{Nd})/su;

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

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
 *
 * The length is counted in UTF-16 units, like every other length check in the API.
 */
export function meetsPasswordPolicy(value: string): boolean {
  return (
    value.length >= MIN_PASSWORD_LENGTH &&
    value.length <= MAX_PASSWORD_LENGTH &&
    PASSWORD_POLICY_PATTERN.test(value)
  );
}
