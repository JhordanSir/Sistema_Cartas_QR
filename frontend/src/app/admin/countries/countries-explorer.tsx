'use client';

import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { AppShell, PageTitle, SupportingCopy, Workspace, WorkspaceHeader } from '@/components/app-shell';
import { Button, ButtonLink } from '@/components/button';
import { Field, fieldControl } from '@/components/field';
import { Card, Kicker } from '@/components/surfaces';
import { compareNames } from '@/i18n/format';
import { useCopy, useLocale } from '@/i18n/locale-provider';
import { ownerCountriesCopy } from '@/i18n/messages/owner-countries';
import {
  type CountryDetail,
  type CountrySummary,
  countryName,
  fetchCountries,
  fetchCountry,
  fetchRegions,
  languageName,
} from '@/lib/countries';

import { OwnerNavigation } from '../owner-navigation';

/** The last region and country chosen on this device: a convenience, never data. */
const SELECTION_KEY = 'sirio-countries-selection';

interface Selection {
  country: string;
  region: string;
}

type Remote<T> = { status: 'error' } | { status: 'idle' } | { status: 'loading' } | { status: 'ready'; value: T };

const NO_REGIONS: string[] = [];
const NO_COUNTRIES: CountrySummary[] = [];

// The page only mounts in the browser, behind the session check, so it can read
// the stored choice while it renders.
function readSelection(): Selection {
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(SELECTION_KEY) ?? 'null');
    if (typeof stored === 'object' && stored !== null) {
      const { country, region } = stored as Record<string, unknown>;
      if (typeof country === 'string' && typeof region === 'string') return { country, region };
    }
  } catch {
    // A private window, blocked site data or a damaged value: start from scratch.
  }
  return { country: '', region: '' };
}

function saveSelection(selection: Selection): void {
  try {
    window.localStorage.setItem(SELECTION_KEY, JSON.stringify(selection));
  } catch {
    // The choice still works for this visit even if it cannot be remembered.
  }
}

function loadRegions(_input: string, signal: AbortSignal): Promise<string[]> {
  return fetchRegions(signal);
}

/**
 * Asks the API whenever `input` changes and aborts the call it replaces, so an
 * answer that arrives late never lands on screen. A null input asks nothing.
 */
function useRemote<T>(
  input: string | null,
  load: (input: string, signal: AbortSignal) => Promise<T>,
): Remote<T> & { retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; state: Remote<T> } | null>(null);
  const key = input === null ? null : `${input}\n${attempt}`;

  useEffect(() => {
    if (input === null || key === null) return;
    const controller = new AbortController();
    load(input, controller.signal).then(
      (value) => setResult({ key, state: { status: 'ready', value } }),
      () => {
        // An aborted call is not a failure: a newer one took its place.
        if (!controller.signal.aborted) setResult({ key, state: { status: 'error' } });
      },
    );
    return () => controller.abort();
  }, [input, key, load]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);
  if (key === null) return { retry, status: 'idle' };
  return { retry, ...(result?.key === key ? result.state : { status: 'loading' }) };
}

export function CountriesExplorer() {
  const locale = useLocale();
  const copy = useCopy(ownerCountriesCopy);
  const [selection, setSelection] = useState(readSelection);

  const regions = useRemote('regions', loadRegions);
  const regionList = regions.status === 'ready' ? regions.value : NO_REGIONS;
  const regionNames: Partial<Record<string, string>> = copy.regions;
  const regionOptions = useMemo(
    () =>
      regionList
        .map((value) => ({ label: regionNames[value] ?? value, value }))
        .sort((left, right) => compareNames(left.label, right.label, locale)),
    [locale, regionList, regionNames],
  );

  // A remembered region or country only counts once the list it belongs to has
  // arrived, so the calls always run in order: regions, countries, country.
  const region = regionList.includes(selection.region) ? selection.region : '';
  const countries = useRemote(region || null, fetchCountries);
  const countryList = countries.status === 'ready' ? countries.value : NO_COUNTRIES;
  const countryOptions = useMemo(
    () =>
      countryList
        .map((entry) => ({ label: countryName(entry, locale), value: entry.alpha3 }))
        .sort((left, right) => compareNames(left.label, right.label, locale)),
    [countryList, locale],
  );

  const chosen = countryOptions.find((option) => option.value === selection.country);
  const detail = useRemote(chosen ? chosen.value : null, fetchCountry);

  function chooseRegion(event: ChangeEvent<HTMLSelectElement>) {
    const next = { country: '', region: event.target.value };
    setSelection(next);
    saveSelection(next);
  }

  function chooseCountry(event: ChangeEvent<HTMLSelectElement>) {
    const next = { country: event.target.value, region };
    setSelection(next);
    saveSelection(next);
  }

  const failure =
    regions.status === 'error'
      ? { message: copy.region.error, retry: regions.retry }
      : countries.status === 'error'
        ? { message: copy.country.error, retry: countries.retry }
        : detail.status === 'error' && chosen
          ? { message: copy.detail.error(chosen.label), retry: detail.retry }
          : null;

  return (
    <AppShell navigation={<OwnerNavigation active="profile" />}>
      <Workspace className="max-w-[64rem]">
        <WorkspaceHeader
          actions={
            <ButtonLink href="/admin" tone="quiet">
              {copy.back}
            </ButtonLink>
          }
        >
          <Kicker tone="teal">{copy.kicker}</Kicker>
          <PageTitle>{copy.title}</PageTitle>
          <SupportingCopy>{copy.lede}</SupportingCopy>
        </WorkspaceHeader>

        <Card accent="teal" className="grid gap-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={copy.region.label}>
              <select
                className={fieldControl}
                disabled={regions.status !== 'ready'}
                onChange={chooseRegion}
                value={region}
              >
                <option value="">{regions.status === 'loading' ? copy.region.loading : copy.region.placeholder}</option>
                {regionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={copy.country.label}>
              <select
                className={fieldControl}
                disabled={countries.status !== 'ready'}
                onChange={chooseCountry}
                value={chosen ? chosen.value : ''}
              >
                <option value="">
                  {!region
                    ? copy.country.waiting
                    : countries.status === 'loading'
                      ? copy.country.loading
                      : copy.country.placeholder}
                </option>
                {countryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {failure ? (
            <div
              className="flex flex-col gap-3 rounded-xl bg-danger-wash px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              role="alert"
            >
              <p className="m-0 text-[13px]/relaxed font-bold text-danger">{failure.message}</p>
              <Button onClick={failure.retry} tone="secondary">
                {copy.retry}
              </Button>
            </div>
          ) : null}
          <p className="m-0 text-xs text-ink-muted">{copy.source}</p>
        </Card>

        <div aria-live="polite" className="mt-4">
          {detail.status === 'loading' && chosen ? (
            <p className="m-0 text-[13px] text-ink-muted" role="status">
              {copy.detail.loading(chosen.label)}
            </p>
          ) : null}
          {detail.status === 'ready' ? <CountryCard country={detail.value} /> : null}
        </div>
      </Workspace>
    </AppShell>
  );
}

function CountryCard({ country }: { country: CountryDetail }) {
  const locale = useLocale();
  const copy = useCopy(ownerCountriesCopy).detail;
  const name = countryName(country, locale);

  return (
    <Card className="grid gap-5 p-5">
      <div className="flex items-center gap-4">
        {country.flagUrl ? (
          // An SVG on flagcdn.com, the address countries.dev gives. next/image would
          // need that host configured and does not optimise SVG anyway.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={copy.flag(name)}
            className="h-12 w-auto shrink-0 rounded border border-line"
            src={country.flagUrl}
          />
        ) : null}
        <div className="min-w-0">
          <h2 className="m-0 font-display text-2xl tracking-tight break-words">{name}</h2>
          <p className="m-0 mt-1 text-[13px] text-ink-soft">
            {copy.nativeName}: <strong className="text-ink">{country.nativeName ?? '—'}</strong>
            {' · '}
            {copy.capital}: <strong className="text-ink">{country.capital ?? copy.noCapital}</strong>
          </p>
        </div>
      </div>

      {country.languages.length === 0 ? (
        <p className="m-0 text-[13px] text-ink-muted">{copy.noLanguages}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table aria-label={copy.languages(name)} className="w-full border-separate border-spacing-0 text-left text-[13px]">
            <thead>
              <tr>
                <th
                  className="border-b border-line bg-control px-3 py-2 text-[11px] font-bold tracking-[0.08em] text-ink-muted uppercase"
                  scope="col"
                >
                  {copy.language}
                </th>
                <th
                  className="border-b border-line bg-control px-3 py-2 text-[11px] font-bold tracking-[0.08em] text-ink-muted uppercase"
                  scope="col"
                >
                  {copy.languageNative}
                </th>
              </tr>
            </thead>
            <tbody>
              {country.languages.map((language) => (
                <tr key={`${language.code ?? ''}-${language.name}`}>
                  <td className="border-b border-line px-3 py-2.5 font-bold text-ink">{languageName(language, locale)}</td>
                  <td className="border-b border-line px-3 py-2.5 text-ink" lang={language.code ?? undefined}>
                    {language.nativeName ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
