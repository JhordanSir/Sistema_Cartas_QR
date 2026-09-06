'use client';

import { type InputHTMLAttributes, useId, useState } from 'react';

import { fieldControl } from './field';

/**
 * Password input with a reveal control.
 *
 * The button sits outside the <label> on purpose: nesting an interactive element
 * inside a label makes every tap on it also target the input, and screen readers
 * announce the pair as one confusing control. The label is wired with htmlFor so
 * getByLabel still resolves the input in the suites.
 */
export function PasswordField({
  label = 'Contraseña',
  ...rest
}: { label?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'type'>) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="grid gap-2">
      <label className="text-[13px] font-bold text-ink-soft" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
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
          {revealed ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
    </div>
  );
}
