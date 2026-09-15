'use client';

import type { ReactNode } from 'react';

import { useCopy } from '@/i18n/locale-provider';
import { shellCopy } from '@/i18n/messages/shell';

import { cn } from './cn';

/**
 * Row actions that are a bottom sheet on a phone and an inline cluster from lg.
 *
 * The buttons are a single set in the DOM, repositioned by CSS. Rendering one copy
 * for mobile and another for desktop would give every action two matching roles and
 * make `getByRole` ambiguous in the suites.
 */
export function ActionSheet({
  children,
  label,
  onClose,
  open,
}: {
  children: ReactNode;
  label: string;
  onClose: () => void;
  open: boolean;
}) {
  const copy = useCopy(shellCopy);
  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-30 bg-ink/50 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
          role="presentation"
        />
      ) : null}
      <div
        aria-label={label}
        className={cn(
          'lg:flex lg:flex-wrap lg:items-center lg:gap-1.5',
          open
            ? [
                'max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-40 max-lg:grid max-lg:gap-1.5',
                'max-lg:rounded-t-2xl max-lg:border-t max-lg:border-line max-lg:bg-paper-raised',
                'max-lg:p-4 max-lg:pb-[calc(1rem+env(safe-area-inset-bottom))] max-lg:shadow-raised',
              ].join(' ')
            : 'max-lg:hidden',
        )}
        role="group"
      >
        {open ? (
          <p className="m-0 pb-1 text-[11px] font-extrabold tracking-[0.1em] text-ink-muted uppercase lg:hidden">
            {label}
          </p>
        ) : null}
        {children}
        {open ? (
          <button
            className="min-h-11 rounded-lg bg-control text-[13px] font-bold text-ink-soft lg:hidden"
            onClick={onClose}
            type="button"
          >
            {copy.close}
          </button>
        ) : null}
      </div>
    </>
  );
}
