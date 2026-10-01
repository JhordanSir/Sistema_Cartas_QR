// Temporary passwords of the backoffice (§E12): 12 characters that always meet
// the policy of §E5. Look-alike characters (0 and O, 1, l and I) are left out,
// because the administrator often dictates the password to the owner.

const LOWERCASE = 'abcdefghijkmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const ANY = LOWERCASE + UPPERCASE + DIGITS;

export const TEMPORARY_PASSWORD_LENGTH = 12;

/**
 * `randomInt(max)` must return a uniform integer in [0, max): on the server,
 * `crypto.randomInt`. Taking it as a parameter keeps this module pure.
 */
export function generateTemporaryPassword(randomInt: (max: number) => number): string {
  const pick = (alphabet: string): string => alphabet.charAt(randomInt(alphabet.length));
  const characters = [pick(LOWERCASE), pick(UPPERCASE), pick(DIGITS)];
  while (characters.length < TEMPORARY_PASSWORD_LENGTH) characters.push(pick(ANY));

  // Fisher–Yates, so the three guaranteed characters are not always first.
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const other = randomInt(index + 1);
    const current = characters[index] ?? '';
    characters[index] = characters[other] ?? '';
    characters[other] = current;
  }
  return characters.join('');
}
