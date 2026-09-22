import type { Locale } from '@/i18n/locale';

/**
 * Open-Meteo is public, keyless and CORS-enabled, so the browser calls it directly.
 * It is the only third party the frontend reaches without going through the BFF.
 */
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
// Every restaurant on the platform is in Peru; without the filter "San Miguel"
// resolves to San Miguelito, Panama, before any Peruvian place.
const COUNTRY_CODE = 'PE';

export type WeatherCondition =
  | 'clear'
  | 'drizzle'
  | 'fog'
  | 'freezingDrizzle'
  | 'freezingRain'
  | 'mainlyClear'
  | 'overcast'
  | 'partlyCloudy'
  | 'rain'
  | 'showers'
  | 'snow'
  | 'snowShowers'
  | 'thunderstorm'
  | 'thunderstormHail'
  | 'unknown';

export type TemperatureUnit = 'celsius' | 'fahrenheit';

export interface CurrentWeather {
  condition: WeatherCondition;
  isDay: boolean;
  /** "15:00", in the place's own time zone. */
  measuredAt: string;
  temperature: number;
  unit: TemperatureUnit;
}

interface WeatherPlace {
  latitude: number;
  longitude: number;
  region: string | null;
}

export type WeatherLookup =
  | { kind: 'found'; region: string | null; weather: CurrentWeather }
  | { kind: 'not-found' };

export class WeatherUnavailableError extends Error {}

const WMO_CONDITIONS: Record<number, WeatherCondition> = {
  0: 'clear',
  1: 'mainlyClear',
  2: 'partlyCloudy',
  3: 'overcast',
  45: 'fog',
  48: 'fog',
  51: 'drizzle',
  53: 'drizzle',
  55: 'drizzle',
  56: 'freezingDrizzle',
  57: 'freezingDrizzle',
  61: 'rain',
  63: 'rain',
  65: 'rain',
  66: 'freezingRain',
  67: 'freezingRain',
  71: 'snow',
  73: 'snow',
  75: 'snow',
  77: 'snow',
  80: 'showers',
  81: 'showers',
  82: 'showers',
  85: 'snowShowers',
  86: 'snowShowers',
  95: 'thunderstorm',
  96: 'thunderstormHail',
  99: 'thunderstormHail',
};

/** Groups the WMO weather interpretation codes Open-Meteo returns. */
export function weatherCondition(code: number): WeatherCondition {
  return WMO_CONDITIONS[code] ?? 'unknown';
}

export function temperatureUnit(locale: Locale): TemperatureUnit {
  return locale === 'en' ? 'fahrenheit' : 'celsius';
}

export function geocodingUrl(city: string, locale: Locale): string {
  const query = new URLSearchParams({
    count: '1',
    countryCode: COUNTRY_CODE,
    format: 'json',
    language: locale,
    name: city,
  });
  return `${GEOCODING_URL}?${query.toString()}`;
}

export function forecastUrl(
  place: { latitude: number; longitude: number },
  unit: TemperatureUnit,
): string {
  const query = new URLSearchParams({
    current: 'temperature_2m,weather_code,is_day',
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    temperature_unit: unit,
    timezone: 'auto',
  });
  return `${FORECAST_URL}?${query.toString()}`;
}

/** The first match, or null when Open-Meteo knows no place by that name. */
export function parsePlace(body: unknown): WeatherPlace | null {
  const first = isRecord(body) && Array.isArray(body.results) ? (body.results[0] as unknown) : null;
  if (!isRecord(first) || !isFiniteNumber(first.latitude) || !isFiniteNumber(first.longitude)) {
    return null;
  }
  return {
    latitude: first.latitude,
    longitude: first.longitude,
    region: nonEmptyString(first.admin1) ?? nonEmptyString(first.country),
  };
}

export function parseCurrentWeather(body: unknown, unit: TemperatureUnit): CurrentWeather {
  const current = isRecord(body) ? body.current : null;
  if (!isRecord(current)) throw new WeatherUnavailableError('Forecast without current conditions');
  const { is_day: isDay, temperature_2m: temperature, time, weather_code: code } = current;
  // With timezone=auto the time is the place's local wall clock: "2026-09-22T15:00".
  const measuredAt = typeof time === 'string' ? /T(\d{2}:\d{2})/.exec(time)?.[1] : undefined;
  if (!isFiniteNumber(temperature) || !isFiniteNumber(code) || !measuredAt) {
    throw new WeatherUnavailableError('Forecast with an unexpected shape');
  }
  return {
    condition: weatherCondition(code),
    isDay: isDay !== 0,
    measuredAt,
    temperature,
    unit,
  };
}

export async function lookUpWeather(
  city: string,
  locale: Locale,
  signal?: AbortSignal,
): Promise<WeatherLookup> {
  const place = parsePlace(await requestJson(geocodingUrl(city, locale), signal));
  if (!place) return { kind: 'not-found' };
  const unit = temperatureUnit(locale);
  const weather = parseCurrentWeather(await requestJson(forecastUrl(place, unit), signal), unit);
  return { kind: 'found', region: place.region, weather };
}

async function requestJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new WeatherUnavailableError(`Open-Meteo answered ${response.status}`);
  return response.json();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
