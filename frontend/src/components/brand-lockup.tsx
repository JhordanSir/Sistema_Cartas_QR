'use client';

import Image from 'next/image';
import Link from 'next/link';

import { useCopy } from '@/i18n/locale-provider';
import { shellCopy } from '@/i18n/messages/shell';

import { cn } from './cn';

/**
 * Sirio wordmark. `compact` hides the "Automatiza" half on narrow navigation rails
 * where the mark alone already identifies the product.
 */
export function BrandLockup({
  className,
  compact = false,
  showTagline = true,
}: {
  className?: string;
  compact?: boolean;
  showTagline?: boolean;
}) {
  const copy = useCopy(shellCopy);
  return (
    <Link
      aria-label={copy.brandHome}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center gap-2.5 text-sm font-bold tracking-tight text-ink no-underline',
        className,
      )}
      href="/"
    >
      <Image
        alt=""
        className="size-9 rounded-xl border border-line object-cover shadow-sm"
        height={36}
        src="/brand/sirio-logo.webp"
        width={36}
      />
      <span className={cn(compact && 'sr-only sm:not-sr-only')}>
        Sirio{showTagline ? <b className="font-extrabold text-teal"> Automatiza</b> : null}
      </span>
    </Link>
  );
}
