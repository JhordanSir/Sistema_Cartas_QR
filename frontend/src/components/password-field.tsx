'use client';

import { type InputHTMLAttributes, type ReactNode, useId, useState } from 'react';

import { useCopy } from '@/i18n/locale-provider';
import { shellCopy } from '@/i18n/messages/shell';

import { fieldControl } from './field';

/**
 * Password input with a reveal control.
 *
 * The button sits outside the <label> on purpose: nesting an interactive element
 * inside a label makes every tap on it also target the input, and screen readers
 * announce the pair as one confusing control. The label is wired with htmlFor so
 * getByLabel still resolves the input in the suites.
 *
 * `error` blocks and is announced assertively; `hint` is advisory and polite.
 */
export function PasswordField({
  error,
  hint,
  label,
  ...rest
}: { error?: ReactNode; hint?: ReactNode; label?: string } & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className' | 'type'
>) {
  const copy = useCopy(shellCopy).password;
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const [revealed, setRevealed] = useState(false);
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');

  return (
    <div className="grid gap-2">
      <label className="text-[13px] font-bold text-ink-soft" htmlFor={id}>
        {label ?? copy.label}
      </label>
      <div className="relative">
        <input
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? true : undefined}
          className={`${fieldControl} pr-24`}
          id={id}
          type={revealed ? 'text' : 'password'}
          {...rest}
        />
        <button
          aria-controls={id}
          aria-pressed={revealed}
          className="absolute inset-y-0 right-0 inline-flex min-h-11 items-center rounded-lg px-3 text-[11px] font-extrabold text-olive hover:text-olive-hover"
          onClick={() => setRevealed((current) => !current)}
          type="button"
        >
          {revealed ? copy.hide : copy.show}
        </button>
      </div>
      {error ? (
        <p className="m-0 text-[13px]/relaxed text-danger" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p className="m-0 text-[13px]/relaxed text-copper" id={hintId} role="status">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
