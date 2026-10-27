'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { useCopy } from '@/i18n/locale-provider';
import { shellCopy } from '@/i18n/messages/shell';

import { BrandLockup } from './brand-lockup';
import { cn } from './cn';
import { LanguageSwitcher } from './language-switcher';
import { ThemeToggle } from './theme-toggle';

/**
 * Navigation for the owner panel and the backoffice.
 *
 * On a phone this renders a slim top bar (brand, theme, sign out) plus a fixed
 * bottom tab bar within thumb reach. From lg both collapse back into the classic
 * side rail.
 *
 * The <nav> is a single element in the DOM, repositioned with `position: fixed`
 * rather than rendered twice: duplicating it would give every destination two
 * matching links and break `getByRole` in the suites.
 */
export function SideRail({
  children,
  label,
  onLogout,
}: {
  children: ReactNode;
  label: string;
  onLogout: () => void;
}) {
  const copy = useCopy(shellCopy);
  return (
    <aside
      className={cn(
        // Deliberately no backdrop-blur here: backdrop-filter turns an element into the
        // containing block for its position: fixed descendants, which would anchor the
        // bottom tab bar inside this header and cover the header's own controls.
        'fixed inset-x-0 top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-canvas px-3 py-2',
        'lg:sticky lg:inset-x-auto lg:h-dvh lg:flex-col lg:items-stretch lg:justify-start lg:gap-0 lg:border-r lg:border-b-0 lg:px-4 lg:py-6',
      )}
    >
      <BrandLockup compact />

      <nav
        aria-label={label}
        className={cn(
          'fixed inset-x-0 bottom-0 z-20 flex justify-around gap-0.5 border-t border-line bg-canvas/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur',
          'lg:static lg:mt-10 lg:flex-col lg:justify-start lg:gap-0.5 lg:border-t-0 lg:bg-transparent lg:px-0 lg:pb-0 lg:backdrop-blur-none',
        )}
      >
        {children}
      </nav>

      {/* Theme, language, sign out: the same order on the phone bar and the desktop
          rail, so the tab order always matches what is on screen. */}
      <div className="flex shrink-0 items-center gap-1 lg:mt-auto lg:flex-col lg:items-stretch lg:gap-1">
        <ThemeToggle />
        <LanguageSwitcher className="lg:w-full" />
        <button
          className={cn(
            'flex min-h-11 shrink-0 items-center gap-2.5 rounded-lg px-3 text-sm font-semibold text-ink-soft',
            'transition-colors duration-150 hover:bg-paper hover:text-ink lg:w-full',
          )}
          onClick={onLogout}
          type="button"
        >
          <span aria-hidden="true">↗</span>
          {copy.signOut}
        </button>
      </div>
    </aside>
  );
}

export function NavItem({
  active,
  children,
  href,
  icon,
}: {
  active: boolean;
  children: ReactNode;
  href: string;
  icon: string;
}) {
  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5',
        'text-[10px] font-semibold no-underline transition-colors duration-150',
        'lg:min-h-11 lg:flex-none lg:flex-row lg:justify-start lg:gap-2.5 lg:px-3 lg:py-0 lg:text-sm',
        active
          ? 'bg-paper text-ink shadow-[0_0_0_1px_rgb(29_41_33/0.05)]'
          : 'text-ink-soft hover:bg-paper/70 hover:text-ink',
      )}
      href={href}
    >
      <span aria-hidden="true" className="text-lg leading-none lg:text-base">
        {icon}
      </span>
      {children}
    </Link>
  );
}
