'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { BrandLockup } from './brand-lockup';
import { cn } from './cn';

/**
 * Navigation frame for the owner panel and the backoffice.
 *
 * Mobile-first: a sticky horizontal bar with readable labels. Only from lg does it
 * become the vertical rail. The previous stylesheet shrank the labels to
 * `font-size: 0` on phones, leaving unlabelled glyphs; every destination now keeps
 * its name and a 44px touch target.
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
  return (
    <aside
      className={cn(
        'sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-canvas/95 px-3 py-2 backdrop-blur',
        'lg:h-dvh lg:flex-col lg:items-stretch lg:gap-0 lg:border-r lg:border-b-0 lg:px-4 lg:py-6',
      )}
    >
      <BrandLockup compact />
      <nav
        aria-label={label}
        className="no-scrollbar flex min-w-0 flex-1 gap-1 overflow-x-auto lg:mt-10 lg:flex-col lg:gap-0.5 lg:overflow-x-visible"
      >
        {children}
      </nav>
      <button
        className={cn(
          'flex min-h-11 shrink-0 items-center gap-2.5 rounded-lg px-3 text-sm font-semibold text-ink-soft',
          'transition-colors duration-150 hover:bg-paper hover:text-ink lg:mt-auto lg:w-full',
        )}
        onClick={onLogout}
        type="button"
      >
        <span aria-hidden="true">↗</span>
        Cerrar sesión
      </button>
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
        'flex min-h-11 shrink-0 items-center gap-2.5 rounded-lg px-3 text-sm font-semibold no-underline',
        'transition-colors duration-150 lg:w-full',
        active
          ? 'bg-paper text-ink shadow-[0_0_0_1px_rgb(29_41_33/0.05)]'
          : 'text-ink-soft hover:bg-paper/70 hover:text-ink',
      )}
      href={href}
    >
      <span aria-hidden="true">{icon}</span>
      {children}
    </Link>
  );
}
