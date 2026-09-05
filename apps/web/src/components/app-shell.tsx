import type { ReactNode } from 'react';

import { shellFontClassName } from '@/lib/fonts';

import { cn } from './cn';

/**
 * Frame shared by the owner panel and the backoffice: navigation plus workspace.
 *
 * Mobile-first — the navigation stacks above the content and only becomes a fixed
 * side rail from lg. The shell fonts are applied here rather than in the root
 * layout so the public menu never preloads typography it does not use.
 */
export function AppShell({
  children,
  navigation,
}: {
  children: ReactNode;
  navigation: ReactNode;
}) {
  return (
    <div className={cn('min-h-dvh lg:grid lg:grid-cols-[14rem_minmax(0,1fr)]', shellFontClassName)}>
      {navigation}
      {children}
    </div>
  );
}

export function Workspace({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'mx-auto w-full px-4 pt-8 pb-16 sm:px-6 lg:px-10 lg:pt-12 xl:px-16',
        className ?? 'max-w-[90rem]',
      )}
    >
      {children}
    </section>
  );
}

export function WorkspaceHeader({
  actions,
  children,
}: {
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:mb-10 md:flex-row md:items-end md:justify-between md:gap-6">
      <div className="min-w-0">{children}</div>
      {actions ? <div className="flex shrink-0 flex-col gap-2 sm:flex-row">{actions}</div> : null}
    </header>
  );
}

/** Display heading shared by every workspace and marketing surface. */
export function PageTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={cn(
        'my-2 font-display text-4xl leading-[0.98] font-semibold tracking-[-0.045em] text-balance sm:text-5xl lg:text-6xl',
        className,
      )}
    >
      {children}
    </h1>
  );
}

export function SupportingCopy({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn('m-0 text-ink-soft/95 leading-relaxed text-pretty', className)}>{children}</p>
  );
}
