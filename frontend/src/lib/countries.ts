import { displayLanguage, displayRegion } from '@/i18n/format';
import { INTL_LOCALE, type Locale } from '@/i18n/locale';

/**
 * countries.dev (formerly apicountries.com) is public, keyless and CORS-enabled, so
 * the browser calls it directly, as it does Open-Meteo. restcountries.com v3.1, the
 * other source the assignment names, now only answers that it is deprecated.
 */
const COUNTRIES_API = 'https://countries.dev';

/** Regions holding a single territory each: Heard Island, Bouvet Island and Antarctica. */
const HIDDEN_REGIONS = new Set(['Antarctic', 'Antarctic Ocean', 'Polar']);

const ALPHA_2 = /^[A-Za-z]{2}$/;
const ALPHA_3 = /^[A-Za-z]{3}$/;

export interface CountrySummary {
  /** ISO 3166-1 alpha-2: the browser names the country from it. */
  alpha2: string;
  /** ISO 3166-1 alpha-3: the code /alpha takes. */
  alpha3: string;
  /** The English name the API gives, for a code the browser cannot name. */
  name: string;
}

export interface CountryLanguage {
  /** ISO 639-1, or 639-2 for a language without a two-letter code. */
  code: string | null;
  name: string;
  /** The language's name in itself: "Runa Simi" for Quechua. */
  nativeName: string | null;
}

export interface CountryDetail extends CountrySummary {
  capital: string | null;
  flagUrl: string | null;
  languages: CountryLanguage[];
  /** The country's name in its own language: "Perú". */
  nativeName: string | null;
}

export class CountriesUnavailableError extends Error {}

export function regionUrl(region: string): string {
  return `${COUNTRIES_API}/region/${encodeURIComponent(region)}`;
}

export function countryUrl(alpha3: string): string {
  return `${COUNTRIES_API}/alpha/${encodeURIComponent(alpha3)}`;
}

export function parseRegions(body: unknown): string[] {
  if (!Array.isArray(body)) throw new CountriesUnavailableError('Regions with an unexpected shape');
  return body.filter(
    (region): region is string => typeof region === 'string' && region.trim() !== '' && !HIDDEN_REGIONS.has(region),
  );
}

/** Entries without both codes and a name are skipped rather than failing the list. */
export function parseCountries(body: unknown): CountrySummary[] {
  if (!Array.isArray(body)) throw new CountriesUnavailableError('Countries with an unexpected shape');
  return body.flatMap((entry) => summary(entry) ?? []);
}

export function parseCountry(body: unknown): CountryDetail {
  const base = summary(body);
  if (!base || !isRecord(body)) throw new CountriesUnavailableError('Country with an unexpected shape');
  const flags = isRecord(body.flags) ? body.flags : {};
  return {
    ...base,
    capital: nonEmptyString(body.capital),
    flagUrl: httpsUrl(flags.svg) ?? httpsUrl(flags.png),
    languages: Array.isArray(body.languages) ? body.languages.flatMap((entry) => language(entry) ?? []) : [],
    nativeName: nonEmptyString(body.nativeName),
  };
}

export async function fetchRegions(signal?: AbortSignal): Promise<string[]> {
  return parseRegions(await requestJson(`${COUNTRIES_API}/regions`, signal));
}

export async function fetchCountries(region: string, signal?: AbortSignal): Promise<CountrySummary[]> {
  return parseCountries(await requestJson(regionUrl(region), signal));
}

export async function fetchCountry(alpha3: string, signal?: AbortSignal): Promise<CountryDetail> {
  return parseCountry(await requestJson(countryUrl(alpha3), signal));
}

export function countryName(country: CountrySummary, locale: Locale): string {
  return displayRegion(country.alpha2, locale) ?? country.name;
}

/** "Quechua" in either language, capitalised: Spanish writes "quechua" mid-sentence. */
export function languageName(language: CountryLanguage, locale: Locale): string {
  const name = language.code ? displayLanguage(language.code, locale) : undefined;
  if (!name) return language.name;
  return name.charAt(0).toLocaleUpperCase(INTL_LOCALE[locale]) + name.slice(1);
}

async function requestJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new CountriesUnavailableError(`countries.dev answered ${response.status}`);
  return response.json();
}

function summary(entry: unknown): CountrySummary | null {
  if (!isRecord(entry)) return null;
  const alpha2 = isoCode(entry.alpha2Code, ALPHA_2);
  const alpha3 = isoCode(entry.alpha3Code, ALPHA_3);
  const name = nonEmptyString(entry.name);
  return alpha2 && alpha3 && name ? { alpha2, alpha3, name } : null;
}

function language(entry: unknown): CountryLanguage | null {
  if (!isRecord(entry)) return null;
  const name = nonEmptyString(entry.name);
  if (!name) return null;
  return {
    code: nonEmptyString(entry.iso639_1) ?? nonEmptyString(entry.iso639_2),
    name,
    nativeName: nonEmptyString(entry.nativeName),
  };
}

function isoCode(value: unknown, pattern: RegExp): string | null {
  return typeof value === 'string' && pattern.test(value) ? value.toUpperCase() : null;
}

/** The flag goes into an <img>: only an https address is accepted. */
function httpsUrl(value: unknown): string | null {
  return typeof value === 'string' && value.startsWith('https://') ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
