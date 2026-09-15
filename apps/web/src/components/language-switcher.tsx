'use client';

import { useRouter } from 'next/navigation';
import { type ChangeEvent, useId, useTransition } from 'react';

import { LOCALES, type Locale, isLocale } from '@/i18n/locale';
import { useCopy, useLocale } from '@/i18n/locale-provider';
import { shellCopy } from '@/i18n/messages/shell';

import { cn } from './cn';

// Each language is written in itself, so someone who cannot read the current
// interface still recognises their own.
const LANGUAGE_NAMES: Record<Locale, string> = { en: 'English', es: 'Español' };

/**
 * Native <select>, so keyboard, screen readers and the phone's own picker work
 * without extra code. It stores the choice and refreshes the Server Components,
 * which render again in the new language while client state is kept.
 *
 * Uncontrolled and keyed by the locale: the picked option stays visible while the
 * request runs, and the new render remounts it with the confirmed value.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const router = useRouter();
  const locale = useLocale();
  const copy = useCopy(shellCopy);
  const id = useId();
  const [switching, startTransition] = useTransition();

  async function changeLanguage(event: ChangeEvent<HTMLSelectElement>) {
    const select = event.currentTarget;
    const next = select.value;
    // No comparison with the current locale: it stays stale until the refresh lands, and
    // skipping the request would lose a quick switch back to the previous language.
    if (!isLocale(next)) return;

    const response = await fetch('/api/session/locale', {
      body: JSON.stringify({ locale: next }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    }).catch(() => null);
    if (!response?.ok) {
      select.value = locale;
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className={cn('relative shrink-0', className)}>
      <label className="sr-only" htmlFor={id}>
        {copy.language}
      </label>
      {/* pr-7 leaves just enough room for the chevron: the landing header has to
          fit brand, this control and "Ingresar" on a 390px phone. */}
      <select
        aria-busy={switching || undefined}
        className={cn(
          'min-h-11 w-full cursor-pointer appearance-none rounded-lg bg-control py-2 pr-7 pl-3',
          'text-base font-semibold text-ink transition-colors duration-150 hover:bg-control-hover',
        )}
        defaultValue={locale}
        id={id}
        key={locale}
        onChange={(event) => void changeLanguage(event)}
      >
        {LOCALES.map((option) => (
          <option key={option} lang={option} value={option}>
            {LANGUAGE_NAMES[option]}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-2.5 grid place-items-center text-xs text-ink-muted"
      >
        ⌄
      </span>
    </div>
  );
}
