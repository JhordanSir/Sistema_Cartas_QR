'use client';

import { useState } from 'react';

type Errors<Field extends string> = Partial<Record<Field, string>>;

function without<Field extends string>(errors: Errors<Field>, field: Field): Errors<Field> {
  if (!(field in errors)) return errors;
  const rest = { ...errors };
  delete rest[field];
  return rest;
}

/**
 * Values and errors of a form that follows the project rule (CLAUDE.md): errors
 * appear on submit and disappear as soon as their field is corrected, never on
 * blur. Errors sent by the server stay until their own field changes.
 */
export function useFormFields<Field extends string>(
  initial: Record<Field, string>,
  validate: (values: Record<Field, string>) => Errors<Field>,
) {
  const [values, setValues] = useState(initial);
  const [clientErrors, setClientErrors] = useState<Errors<Field>>({});
  const [serverErrors, setServerErrors] = useState<Errors<Field>>({});

  function setValue(field: Field, value: string): void {
    const next = { ...values, [field]: value };
    setValues(next);
    setServerErrors((previous) => without(previous, field));
    setClientErrors((previous) => {
      const shown = Object.keys(previous) as Field[];
      if (shown.length === 0) return previous;
      const current = validate(next);
      const kept: Errors<Field> = {};
      for (const key of shown) {
        const message = current[key];
        if (message) kept[key] = message;
      }
      return kept;
    });
  }

  /** Runs every rule and shows the result; returns it so the caller can focus the first error. */
  function validateAll(): Errors<Field> {
    const result = validate(values);
    setClientErrors(result);
    setServerErrors({});
    return result;
  }

  function reset(): void {
    setValues(initial);
    setClientErrors({});
    setServerErrors({});
  }

  return {
    errors: { ...clientErrors, ...serverErrors },
    reset,
    setServerErrors,
    setValue,
    validateAll,
    values,
  };
}

/** Moves the focus to the first field, in screen order, that has an error. */
export function focusFirstError<Field extends string>(
  errors: Errors<Field>,
  fieldIds: Record<Field, string>,
): boolean {
  const first = (Object.keys(fieldIds) as Field[]).find((field) => errors[field]);
  if (!first) return false;
  document.getElementById(fieldIds[first])?.focus();
  return true;
}
