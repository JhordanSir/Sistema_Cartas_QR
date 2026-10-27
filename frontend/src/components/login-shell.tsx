import type { ReactNode } from 'react';

import { shellFontClassName } from '@/lib/fonts';

import { BrandLockup } from './brand-lockup';
import { cn } from './cn';
import { LanguageSwitcher } from './language-switcher';
import { Kicker } from './surfaces';

/**
 * Shared frame for the two access screens. The owner variant carries a copper edge
 * so a distracted owner can tell at a glance which door they are at.
 */
export function LoginShell({
  children,
  footer,
  kicker,
  lede,
  owner = false,
  title,
  titleId,
}: {
  children: ReactNode;
  footer?: ReactNode;
  kicker: string;
  lede: string;
  owner?: boolean;
  title: string;
  titleId: string;
}) {
  return (
    <main
      className={cn(
        'grid min-h-dvh grid-rows-[auto_1fr] gap-8 px-5 pt-6 pb-12 sm:px-10 lg:px-20',
        shellFontClassName,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <BrandLockup showTagline={false} />
        <LanguageSwitcher />
      </div>
      <section
        aria-labelledby={titleId}
        className={cn(
          'w-full max-w-[28.5rem] justify-self-center self-center rounded-3xl bg-paper p-7 shadow-soft sm:p-10 lg:p-12',
          owner && 'border-t-4 border-t-copper',
        )}
      >
        <Kicker>{kicker}</Kicker>
        <h1
          className="mt-4 mb-4 font-display text-4xl leading-[0.98] font-semibold tracking-[-0.045em] text-balance sm:text-5xl"
          id={titleId}
        >
          {title}
        </h1>
        <p className="mt-0 mb-7 text-ink-soft leading-relaxed text-pretty">{lede}</p>
        {children}
        {footer}
      </section>
    </main>
  );
}
