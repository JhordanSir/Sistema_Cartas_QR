import type { ReactNode } from 'react';

import { cn } from './cn';

/** Raised sheet of paper: every panel section sits on one. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-card border border-line bg-raised shadow-card', className)}>
      {children}
    </div>
  );
}

type NoticeTone = 'error' | 'success';

const NOTICE_TONES: Record<NoticeTone, string> = {
  error: 'border-danger/40 bg-danger-wash text-danger',
  success: 'border-success/30 bg-success-wash text-success',
};

/** Feedback after an action. Errors interrupt the screen reader; successes wait their turn. */
export function Notice({ children, tone }: { children: ReactNode; tone: NoticeTone }) {
  return (
    <div
      className={cn('rounded-control border px-4 py-3 text-sm font-medium', NOTICE_TONES[tone])}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  );
}

type PillTone = 'danger' | 'neutral' | 'success' | 'warning';

const PILL_TONES: Record<PillTone, string> = {
  danger: 'bg-danger-wash text-danger',
  neutral: 'bg-control text-ink-soft',
  success: 'bg-success-wash text-success',
  warning: 'bg-warning-wash text-warning',
};

export function StatusPill({ children, tone }: { children: ReactNode; tone: PillTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        PILL_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}
