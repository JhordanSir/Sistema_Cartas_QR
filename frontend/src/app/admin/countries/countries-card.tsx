'use client';

import { ButtonLink } from '@/components/button';
import { Card, Kicker } from '@/components/surfaces';
import { useCopy } from '@/i18n/locale-provider';
import { ownerCountriesCopy } from '@/i18n/messages/owner-countries';

/** Sits under the weather card on the profile: the other example of a public API. */
export function CountriesCard() {
  const copy = useCopy(ownerCountriesCopy).card;

  return (
    <Card className="p-6">
      <section aria-labelledby="countries-card-title">
        <Kicker tone="teal">
          <span id="countries-card-title">{copy.title}</span>
        </Kicker>
        <p className="m-0 mt-4 text-[13px]/relaxed text-ink-soft">{copy.body}</p>
        <ButtonLink className="mt-4" full href="/admin/countries" tone="quiet">
          {copy.action}
        </ButtonLink>
      </section>
    </Card>
  );
}
