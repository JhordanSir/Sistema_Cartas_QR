import Link from 'next/link';

import { BrandLockup } from '@/components/brand-lockup';
import { ButtonLink } from '@/components/button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { formatCurrency } from '@/i18n/format';
import type { Locale } from '@/i18n/locale';
import { landingCopy } from '@/i18n/messages/landing';
import { getLocale } from '@/i18n/server';
import { shellFontClassName } from '@/lib/fonts';

// Dish names stay in Spanish in both languages: the preview stands for a real menu,
// and a restaurant's own content is never translated.
const PREVIEW_DISHES = [
  { name: 'Ceviche clásico', price: '38' },
  { name: 'Lomo saltado', price: '42' },
  { name: 'Causa de pulpo', price: '26' },
];

export default async function HomePage() {
  const locale = await getLocale();
  const copy = landingCopy[locale];
  return (
    <main className={`min-h-dvh overflow-hidden bg-canvas text-ink ${shellFontClassName}`}>
      <div className="relative isolate mx-auto w-full max-w-[82.5rem] px-4 pt-5 sm:px-6 lg:px-16">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-40 -right-52 -z-10 hidden size-[36rem] rounded-full border border-copper/15 shadow-[0_0_0_5.5rem_rgb(172_86_53/0.035),0_0_0_11rem_rgb(172_86_53/0.02)] sm:block lg:-right-60 lg:size-[42rem]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-24 bottom-28 left-[6%] -z-10 hidden w-px bg-gradient-to-b from-transparent via-olive/15 to-transparent lg:block"
        />

        {/* gap-2 in both rows is deliberate: brand, language and "Ingresar" only just
            fit a 390px phone. */}
        <header className="flex min-h-13 items-center justify-between gap-2">
          <BrandLockup />
          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitcher />
            {/* Un único acceso arriba: el dueño es quien lo necesita a la vista.
                "Administración" vive en el pie, donde el admin sabe buscarlo. */}
            <Link
              className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-ink px-4 text-xs font-extrabold whitespace-nowrap text-paper no-underline shadow-md transition-colors hover:bg-olive"
              href="/admin/login"
            >
              {copy.signIn}
            </Link>
          </div>
        </header>

        <section
          aria-labelledby="hero-title"
          className="grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(21rem,0.8fr)] lg:gap-20 lg:py-24"
        >
          <div className="relative z-10">
            <p className="m-0 flex items-center gap-2.5 text-[10px] font-extrabold tracking-[0.16em] text-olive uppercase">
              <span aria-hidden="true" className="h-px w-5.5 bg-current" />
              {copy.hero.kicker}
            </p>
            <h1
              className="mt-5 mb-6 max-w-[11ch] font-display text-5xl leading-[0.9] font-semibold tracking-[-0.06em] text-balance sm:text-6xl lg:text-7xl xl:text-[5.625rem]"
              id="hero-title"
            >
              {copy.hero.titleStart}{' '}
              <em className="text-copper not-italic">{copy.hero.titleEmphasis}</em>
            </h1>
            <p className="m-0 max-w-[55ch] text-[15px]/[1.72] text-ink-soft text-pretty sm:text-base lg:text-lg">
              {copy.hero.lede}
            </p>
            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
              <ButtonLink className="min-h-12.5" href="/admin/login" tone="primary">
                {copy.hero.primary} <span aria-hidden="true">→</span>
              </ButtonLink>
              <ButtonLink
                className="min-h-12.5"
                href="https://wa.me/51973502261"
                rel="noreferrer"
                target="_blank"
                tone="quiet"
              >
                {copy.hero.secondary}
              </ButtonLink>
            </div>
            <p className="mt-6 mb-0 text-[11px] font-bold text-ink-muted">{copy.hero.note}</p>
          </div>

          <MenuPreviewArt copy={copy.preview} locale={locale} />
        </section>

        <section
          aria-labelledby="capabilities-title"
          className="grid gap-10 border-t border-line py-12 lg:grid-cols-[minmax(15.6rem,0.75fr)_minmax(0,1.25fr)] lg:gap-24 lg:py-16"
        >
          <div>
            <p className="m-0 flex items-center gap-2.5 text-[10px] font-extrabold tracking-[0.16em] text-olive uppercase">
              <span aria-hidden="true" className="h-px w-5.5 bg-current" />
              {copy.capabilities.kicker}
            </p>
            <h2
              className="mt-4 mb-0 max-w-[13ch] font-display text-3xl leading-[0.94] font-semibold tracking-[-0.055em] text-balance sm:text-4xl lg:text-5xl"
              id="capabilities-title"
            >
              {copy.capabilities.title}
            </h2>
          </div>
          <div className="grid">
            {copy.capabilities.items.map((capability, index) => (
              <article
                className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-4 border-b border-line pb-6 last:border-b-0 last:pb-0 [&:not(:last-child)]:mb-6 sm:gap-5"
                key={capability.title}
              >
                <span
                  aria-hidden="true"
                  className="font-display text-base font-bold tracking-tight text-copper"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="mt-0 mb-2 text-base font-bold tracking-tight text-ink">
                    {capability.title}
                  </h3>
                  <p className="m-0 max-w-[52ch] text-[13px]/relaxed text-ink-soft">
                    {capability.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="questions-title"
          className="grid gap-8 border-t border-line py-12 lg:grid-cols-[minmax(15.6rem,0.75fr)_minmax(0,1.25fr)] lg:gap-24 lg:py-16"
        >
          <div>
            <p className="m-0 flex items-center gap-2.5 text-[10px] font-extrabold tracking-[0.16em] text-olive uppercase">
              <span aria-hidden="true" className="h-px w-5.5 bg-current" />
              {copy.questions.kicker}
            </p>
            <h2
              className="mt-4 mb-0 max-w-[13ch] font-display text-3xl leading-[0.94] font-semibold tracking-[-0.055em] text-balance sm:text-4xl lg:text-5xl"
              id="questions-title"
            >
              {copy.questions.title}
            </h2>
          </div>
          <div className="grid gap-2">
            {copy.questions.items.map((entry) => (
              <details
                className="group rounded-xl border border-line bg-paper px-4 shadow-soft"
                key={entry.question}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-bold text-ink [&::-webkit-details-marker]:hidden">
                  {entry.question}
                  <span
                    aria-hidden="true"
                    className="grid size-8 shrink-0 place-items-center text-lg text-ink-muted transition-transform duration-200 ease-soft group-open:rotate-180"
                  >
                    ⌄
                  </span>
                </summary>
                <p className="mt-0 mb-4 max-w-[58ch] text-[13px]/relaxed text-ink-soft">
                  {entry.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-line py-6 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[10px] font-bold tracking-[0.06em] text-ink-muted uppercase">
            {copy.footer.brand}
          </span>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
            <span className="text-[10px] font-bold tracking-[0.06em] text-ink-muted uppercase">
              {copy.footer.tagline}
            </span>
            <Link
              className="inline-flex min-h-11 items-center text-[10px] font-extrabold tracking-[0.06em] text-ink-soft uppercase no-underline hover:text-olive"
              href="/login"
            >
              {copy.admin}
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}

/**
 * Decorative rendering of the product itself: the published menu as a diner sees it,
 * next to the permanent code. It replaces a large Sirio logo that took half the
 * screen on a phone without explaining anything.
 */
function MenuPreviewArt({
  copy,
  locale,
}: {
  copy: { menu: string; scan: string; section: string };
  locale: Locale;
}) {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto grid w-full max-w-[22rem] grid-cols-[minmax(0,1fr)_auto] items-end gap-3 justify-self-center sm:max-w-[24rem] sm:gap-4"
    >
      {/* Phone showing a published menu. */}
      <div className="rounded-[1.75rem] border-[6px] border-ink bg-paper p-3 shadow-[0_1.25rem_2.5rem_rgb(41_39_31/0.18)] sm:p-4">
        <span className="mx-auto mb-3 block h-1 w-10 rounded-full bg-ink/15" />
        <span className="block text-[8px] font-extrabold tracking-[0.16em] text-olive uppercase">
          {copy.menu}
        </span>
        <strong className="mt-1 block font-display text-lg leading-tight font-semibold tracking-[-0.03em] text-ink sm:text-xl">
          Cevichería Luna
        </strong>
        <span className="mt-3 block border-t border-line pt-2 text-[8px] font-black tracking-[0.14em] text-ink-muted uppercase">
          {copy.section}
        </span>
        {PREVIEW_DISHES.map((dish) => (
          <span
            className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-b-0"
            key={dish.name}
          >
            <span className="text-[11px] font-semibold text-ink">{dish.name}</span>
            <span className="text-[11px] font-bold text-ink-soft tabular-nums">
              {formatCurrency(dish.price, locale)}
            </span>
          </span>
        ))}
      </div>

      {/* The permanent code that opens it. */}
      <div className="grid justify-items-center gap-2 rounded-2xl border border-line bg-paper p-3 shadow-soft">
        <span className="grid grid-cols-5 gap-[2px]">
          {[
            1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1,
          ].map((filled, index) => (
            <span
              className={`size-1.5 rounded-[1px] ${filled ? 'bg-ink' : 'bg-transparent'}`}
              key={index}
            />
          ))}
        </span>
        <span className="text-[7px] font-black tracking-[0.12em] text-ink-muted uppercase">
          {copy.scan}
        </span>
      </div>
    </div>
  );
}
