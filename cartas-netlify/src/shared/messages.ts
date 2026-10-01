/** Shown whenever an action fails for a reason the user cannot fix (§E13). */
export const GENERIC_ERROR_MESSAGE = 'No pudimos completar la acción. Inténtalo de nuevo.';

/** Body of every API error (§E5). `fields` maps form fields to their message. */
export type ApiErrorBody = {
  code: string;
  message: string;
  fields?: Record<string, string>;
};

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null) return false;
  const { code, message, fields } = value as Record<string, unknown>;
  return (
    typeof code === 'string' &&
    typeof message === 'string' &&
    (fields === undefined ||
      (typeof fields === 'object' &&
        fields !== null &&
        Object.values(fields).every((entry) => typeof entry === 'string')))
  );
}
