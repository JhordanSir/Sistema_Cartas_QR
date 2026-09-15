'use client';

import type { ReactNode } from 'react';

import { useCopy } from '@/i18n/locale-provider';
import { shellCopy } from '@/i18n/messages/shell';

/** Confirmation banner. A client component of its own so surfaces.tsx stays server-safe. */
export function Notice({ children, onDismiss }: { children: ReactNode; onDismiss?: () => void }) {
  const copy = useCopy(shellCopy);
  return (
    <div className="mb-4 flex min-h-12 items-center justify-between gap-3 rounded-lg bg-olive-wash px-4 py-2.5 text-sm font-semibold text-olive-hover">
      <span>{children}</span>
      {onDismiss ? (
        <button
          aria-label={copy.dismissNotice}
          className="grid size-11 place-items-center text-2xl/none"
          onClick={onDismiss}
          type="button"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
