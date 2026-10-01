'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState, type KeyboardEvent } from 'react';

import { Brand } from '@/components/brand';
import { SignOutButton } from '@/components/sign-out-button';
import { cn } from '@/components/ui/cn';

export type NavItem = { href: string; label: string };

const itemClasses = cn(
  'flex min-h-11 items-center rounded-control px-3 text-[15px] font-semibold text-ink-soft no-underline',
  'transition-colors duration-150 hover:bg-control hover:text-ink',
  'aria-[current=page]:bg-wine-wash aria-[current=page]:text-wine',
);

function isActive(pathname: string, href: string, homeHref: string): boolean {
  if (pathname === href) return true;
  return href !== homeHref && pathname.startsWith(`${href}/`);
}

/**
 * Top bar of the panel and the backoffice. One list of links serves both
 * widths: inline from 640 px, folded behind «Menú» below it.
 */
export function AppHeader({ homeHref, items }: { homeHref: string; items: readonly NavItem[] }) {
  const pathname = usePathname();
  // The menu belongs to the page it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const toggleRef = useRef<HTMLButtonElement>(null);

  function closeOnEscape(event: KeyboardEvent<HTMLElement>): void {
    if (event.key !== 'Escape' || !open) return;
    setOpenOn(null);
    toggleRef.current?.focus();
  }

  return (
    <header className="border-b border-line bg-raised" onKeyDown={closeOnEscape}>
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2 sm:px-6">
        <Brand href={homeHref} />
        <button
          aria-controls="app-navigation"
          aria-expanded={open}
          className={cn(
            'inline-flex min-h-11 items-center gap-2 rounded-control border border-control-border bg-raised px-3',
            'text-[15px] font-semibold text-ink sm:hidden',
          )}
          onClick={() => setOpenOn(open ? null : pathname)}
          ref={toggleRef}
          type="button"
        >
          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
            <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
          </svg>
          Menú
        </button>
        <nav
          aria-label="Principal"
          className={cn('w-full pb-2 sm:block sm:w-auto sm:pb-0', open ? 'block' : 'hidden')}
          id="app-navigation"
        >
          <ul className="m-0 grid list-none gap-1 p-0 sm:flex sm:items-center" role="list">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  aria-current={isActive(pathname, item.href, homeHref) ? 'page' : undefined}
                  className={itemClasses}
                  href={item.href}
                  onClick={() => setOpenOn(null)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <SignOutButton className={cn(itemClasses, 'w-full cursor-pointer border-0 bg-transparent text-left')} />
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
