import type { ReactNode } from 'react';

import { cn } from './cn';

/** Shared look for inputs, selects and textareas. 16px text keeps iOS from zooming on focus. */
export const controlClasses = cn(
  'min-h-11 w-full rounded-control border border-control-border bg-control px-3 py-2 text-base text-ink',
  'placeholder:text-ink-muted aria-[invalid=true]:border-danger aria-[invalid=true]:bg-danger-wash',
);

export interface ControlProps {
  'aria-describedby'?: string;
  'aria-invalid'?: true;
  id: string;
}

/**
 * Label, control, hint and error wired together: the hint and the error describe the
 * control, and the error is announced as soon as it appears.
 */
export function Field({
  children,
  className,
  error,
  hint,
  id,
  label,
}: {
  children: (control: ControlProps) => ReactNode;
  className?: string;
  error?: string | null;
  hint?: ReactNode;
  id: string;
  label: ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('grid gap-1.5', className)}>
      <label className="text-sm font-semibold text-ink-soft" htmlFor={id}>
        {label}
      </label>
      {children({
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        id,
      })}
      {hint ? (
        <p className="m-0 text-[13px] text-ink-muted" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="m-0 text-[13px] font-medium text-danger" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
