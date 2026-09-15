'use client';

import { useSyncExternalStore } from 'react';

import { useCopy } from '@/i18n/locale-provider';
import { shellCopy } from '@/i18n/messages/shell';

import { cn } from './cn';

type Theme = 'dark' | 'light' | 'system';

export const THEME_STORAGE_KEY = 'sirio-theme';

const ORDER: Theme[] = ['system', 'light', 'dark'];

const ICONS: Record<Theme, string> = { dark: '☾', light: '☀', system: '◐' };

let listeners: Array<() => void> = [];

function subscribe(listener: () => void): () => void {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((entry) => entry !== listener);
  };
}

function readStoredTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light' || stored === 'system') return stored;
  } catch {
    // Private windows and blocked site data both throw; the default is fine.
  }
  return 'system';
}

// On the server there is no stored preference, so render the neutral state and let
// useSyncExternalStore swap it in after hydration without a mismatch warning.
function readServerTheme(): Theme {
  return 'system';
}

function applyTheme(theme: Theme): void {
  if (theme === 'system') {
    delete document.documentElement.dataset.theme;
    return;
  }
  document.documentElement.dataset.theme = theme;
}

/**
 * Cycles automático → claro → oscuro. The stored choice is applied before paint by
 * the inline script in the root layout, so the panel never flashes the wrong theme.
 *
 * Only the owner panel and the backoffice mount this. The published menu always
 * keeps the colours its owner chose.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const copy = useCopy(shellCopy).theme;
  const theme = useSyncExternalStore(subscribe, readStoredTheme, readServerTheme);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length] ?? 'system';
    applyTheme(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // The theme still applies for this session even if it cannot be persisted.
    }
    for (const listener of listeners) listener();
  }

  const name = copy.names[theme];

  return (
    <button
      aria-label={copy.change(name)}
      className={cn(
        'grid size-11 shrink-0 place-items-center rounded-lg text-base text-ink-soft',
        'transition-colors duration-150 hover:bg-paper hover:text-ink',
        className,
      )}
      onClick={cycle}
      title={copy.current(name)}
      type="button"
    >
      <span aria-hidden="true">{ICONS[theme]}</span>
    </button>
  );
}
