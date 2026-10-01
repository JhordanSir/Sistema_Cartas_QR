import type { ReactNode } from 'react';

import { shellFontClassName } from '@/app/shell-fonts';
import { AppHeader, type NavItem } from '@/components/app-header';
import { cn } from '@/components/ui/cn';

/** Shell of the owner panel and of the backoffice: top bar plus a centred column. */
export function PanelFrame({
  children,
  homeHref,
  items,
  notice,
}: {
  children: ReactNode;
  homeHref: string;
  items: readonly NavItem[];
  /** Shown above every page, such as the paused-restaurant warning. */
  notice?: ReactNode;
}) {
  return (
    <div className={cn(shellFontClassName, 'min-h-dvh bg-paper font-sans text-ink')}>
      <AppHeader homeHref={homeHref} items={items} />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {notice ? <div className="mb-6">{notice}</div> : null}
        {children}
      </main>
    </div>
  );
}
