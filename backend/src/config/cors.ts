export function parseCorsOrigins(rawOrigins: string): string[] {
  return [...new Set(rawOrigins.split(',').map((origin) => origin.trim()))].filter(
    Boolean,
  );
}
