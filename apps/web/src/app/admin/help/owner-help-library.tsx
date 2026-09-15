'use client';

import Link from 'next/link';

import { AppShell, PageTitle, SupportingCopy, Workspace, WorkspaceHeader } from '@/components/app-shell';
import { Kicker } from '@/components/surfaces';
import { useCopy, useLocale } from '@/i18n/locale-provider';
import { ownerHelpCopy } from '@/i18n/messages/owner-help';

import { OwnerNavigation } from '../owner-navigation';

import { ownerTutorials } from './tutorials';

/**
 * Written walkthroughs. They replaced the recorded video tutorials, which showed the
 * previous interface and were removed from the repository.
 *
 * Built on native <details> so it opens without JavaScript and screen readers
 * announce the expanded state for free. The first step is open by default.
 */
export function OwnerHelpLibrary() {
  const copy = useCopy(ownerHelpCopy);
  const tutorials = ownerTutorials[useLocale()];

  return (
    <AppShell navigation={<OwnerNavigation active="help" />}>
      <Workspace className="max-w-[62rem]">
        <WorkspaceHeader
          actions={
            <p className="m-0 inline-flex min-h-9 items-center gap-2 self-start rounded-full bg-teal-wash px-3 text-[10px] font-extrabold tracking-[0.06em] text-teal uppercase">
              <span aria-hidden="true">●</span>
              {copy.badge}
            </p>
          }
        >
          <Kicker tone="teal">{copy.kicker}</Kicker>
          <PageTitle className="max-w-[16ch]">{copy.title}</PageTitle>
          <SupportingCopy>{copy.lede}</SupportingCopy>
        </WorkspaceHeader>

        <ol className="grid list-none gap-3 p-0">
          {tutorials.map((tutorial, index) => (
            <li key={tutorial.id}>
              <details
                className="group overflow-hidden rounded-2xl border border-line bg-paper shadow-soft"
                open={index === 0}
              >
                <summary className="flex cursor-pointer list-none items-start gap-3.5 p-4 sm:gap-4 sm:p-5 [&::-webkit-details-marker]:hidden">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-line-strong bg-canvas text-[11px] font-black text-copper">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-xl leading-tight font-semibold tracking-[-0.03em] text-ink sm:text-2xl">
                      {tutorial.title}
                    </span>
                    <span className="mt-1 block text-[13px]/relaxed text-ink-soft">
                      {tutorial.description}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="grid size-11 shrink-0 place-items-center text-lg text-ink-muted transition-transform duration-200 ease-soft group-open:rotate-180"
                  >
                    ⌄
                  </span>
                </summary>

                <div className="border-t border-line px-4 pt-4 pb-5 sm:px-5">
                  <ol className="m-0 grid list-none gap-3 p-0">
                    {tutorial.steps.map((step, stepIndex) => (
                      <li className="flex gap-3 text-sm/relaxed text-ink-soft" key={step}>
                        <span
                          aria-hidden="true"
                          className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-olive-wash text-[10px] font-black text-olive"
                        >
                          {stepIndex + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  {tutorial.destination ? (
                    <Link
                      className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-olive-wash px-3.5 text-[13px] font-extrabold text-olive no-underline hover:bg-olive-wash/70"
                      href={tutorial.destination.href}
                    >
                      {tutorial.destination.label}
                      <span aria-hidden="true">→</span>
                    </Link>
                  ) : null}
                </div>
              </details>
            </li>
          ))}
        </ol>

        <p className="mt-6 rounded-2xl border border-line bg-paper p-5 text-[13px]/relaxed text-ink-soft shadow-soft">
          {copy.support.before}{' '}
          <a
            className="font-extrabold text-olive"
            href="https://wa.me/51973502261"
            rel="noreferrer"
            target="_blank"
          >
            +51 973 502 261
          </a>{' '}
          {copy.support.after}
        </p>
      </Workspace>
    </AppShell>
  );
}
