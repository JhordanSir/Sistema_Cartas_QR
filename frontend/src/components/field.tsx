import type { ReactNode } from 'react';

import { cn } from './cn';

/**
 * Shared styling for text inputs, selects and textareas. Exported as a string so
 * callers keep full control of the native element and its accessibility wiring.
 *
 * The 16px font size is deliberate: anything smaller makes mobile Safari zoom the
 * page on focus.
 */
export const fieldControl =
  'min-h-11 w-full rounded-lg border border-transparent bg-control px-3 py-2.5 text-base ' +
  'text-ink transition-colors duration-150 hover:border-line-strong';

interface FieldProps {
  children: ReactNode;
  className?: string;
  hint?: ReactNode;
  label: string;
}

/**
 * Wraps a control in its label. The <span> holding the label text is what
 * getByLabel resolves in the test suites, so the structure must stay intact.
 */
export function Field({ children, className, hint, label }: FieldProps) {
  return (
    <label className={cn('grid gap-2', className)}>
      <span className="text-[13px] font-bold text-ink-soft">{label}</span>
      {children}
      {hint ? <small className="text-xs text-ink-muted">{hint}</small> : null}
    </label>
  );
}

export function FormError({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <p className="m-0 text-[13px]/relaxed text-danger" id={id} role="alert">
      {children}
    </p>
  );
}
