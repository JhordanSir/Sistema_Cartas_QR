import { LOCALES, type Locale } from '@/i18n/locale';
import { ownerMenuCopy } from '@/i18n/messages/owner-menu';
import { ownerProfileCopy } from '@/i18n/messages/owner-profile';
import { ownerQrCopy } from '@/i18n/messages/owner-qr';

import { ownerTutorials } from './tutorials';

/** Every plain string in a message table; message functions are skipped. */
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

function shape(locale: Locale) {
  return ownerTutorials[locale].map(({ destination, id, steps }) => ({
    href: destination?.href ?? null,
    id,
    steps: steps.length,
  }));
}

describe('owner tutorials', () => {
  it('offer the same guides, destinations and number of steps in every language', () => {
    expect(shape('en')).toEqual(shape('es'));
  });

  it.each(LOCALES)('quote in %s only button names that the interface really shows', (locale) => {
    const interfaceText = new Set(
      strings([ownerMenuCopy[locale], ownerProfileCopy[locale], ownerQrCopy[locale]]),
    );
    const quoted = ownerTutorials[locale]
      .flatMap((tutorial) => tutorial.steps)
      .flatMap((step) => Array.from(step.matchAll(/“([^”]+)”/g), (match) => match[1] ?? ''));

    expect(quoted.length).toBeGreaterThan(0);
    expect(quoted.filter((label) => !interfaceText.has(label))).toEqual([]);
  });
});
