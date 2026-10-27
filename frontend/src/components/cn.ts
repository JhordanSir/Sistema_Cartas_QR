/** Joins class names, dropping falsy values. */
export function cn(...values: Array<false | null | string | undefined>): string {
  return values.filter(Boolean).join(' ');
}
