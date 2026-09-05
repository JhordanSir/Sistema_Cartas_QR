import type { ReactNode } from 'react';

import { cn } from './cn';

export type AccentTone = 'copper' | 'olive' | 'teal';

const ACCENT_BORDERS: Record<AccentTone, string> = {
  copper: 'border-t-[3px] border-t-copper',
  olive: 'border-t-[3px] border-t-olive',
  teal: 'border-t-[3px] border-t-teal',
};

interface CardProps {
  accent?: AccentTone;
  children: ReactNode;
  className?: string;
}

/** Raised paper surface used by every panel, registry and placard. */
export function Card({ accent, children, className }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-paper shadow-soft',
        accent && ACCENT_BORDERS[accent],
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Small uppercase overline that opens most sections. */
export function Kicker({
  children,
  className,
  tone = 'olive',
}: {
  children: ReactNode;
  className?: string;
  tone?: AccentTone | 'danger' | 'muted';
}) {
  const tones = {
    copper: 'text-copper',
    danger: 'text-danger',
    muted: 'text-ink-muted',
    olive: 'text-olive',
    teal: 'text-teal',
  };
  return (
    <span
      className={cn(
        'text-[11px] font-extrabold tracking-[0.14em] uppercase',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Notice({ children, onDismiss }: { children: ReactNode; onDismiss?: () => void }) {
  return (
    <div className="mb-4 flex min-h-12 items-center justify-between gap-3 rounded-lg bg-olive-wash px-4 py-2.5 text-sm font-semibold text-olive-hover">
      <span>{children}</span>
      {onDismiss ? (
        <button
          aria-label="Cerrar aviso"
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

export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <p
      className="mb-4 flex min-h-12 items-center rounded-lg bg-danger-wash px-4 py-2.5 text-sm font-semibold text-danger"
      role="alert"
    >
      {children}
    </p>
  );
}

export function StatusPill({
  children,
  tone,
}: {
  children: ReactNode;
  tone: 'draft' | 'muted' | 'positive';
}) {
  const tones = {
    draft: 'bg-copper-wash text-copper',
    muted: 'bg-control text-ink-muted',
    positive: 'bg-olive-wash text-olive',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-bold whitespace-nowrap',
        tones[tone],
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

/** Shimmering placeholder used while a panel loads. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'block animate-pulse rounded-xl bg-paper shadow-soft',
        className ?? 'min-h-40',
      )}
    />
  );
}

/** "01 — Título" heading that opens each block inside a card. */
export function NumberedHeading({
  body,
  divider = false,
  number,
  title,
}: {
  body: ReactNode;
  divider?: boolean;
  number: string;
  title: string;
}) {
  return (
    <div
      className={cn(
        'flex gap-4 px-5 pt-7 pb-4 sm:px-8',
        divider && 'mt-3 border-t border-line',
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-olive-wash font-display text-[13px] font-extrabold text-olive">
        {number}
      </span>
      <div className="min-w-0">
        <h2 className="m-0 font-display text-2xl tracking-tight">{title}</h2>
        <p className="mt-1.5 mb-0 text-[13px]/normal text-ink-soft">{body}</p>
      </div>
    </div>
  );
}
