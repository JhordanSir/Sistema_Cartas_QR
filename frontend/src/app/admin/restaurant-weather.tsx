'use client';

import { useEffect, useState } from 'react';

import { Card, Kicker } from '@/components/surfaces';
import { formatNumber } from '@/i18n/format';
import { useCopy, useLocale } from '@/i18n/locale-provider';
import { ownerWeatherCopy } from '@/i18n/messages/owner-weather';
import { type CurrentWeather, lookUpWeather, type WeatherCondition } from '@/lib/weather';

export type WeatherState =
  | { status: 'error' }
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'not-found' }
  | { region: string | null; status: 'ready'; weather: CurrentWeather };

const UNIT_SYMBOLS = { celsius: '°C', fahrenheit: '°F' } as const;

const GLYPHS: Record<WeatherCondition, string> = {
  clear: '☀',
  drizzle: '☂',
  fog: '≋',
  freezingDrizzle: '❄',
  freezingRain: '❄',
  mainlyClear: '☀',
  overcast: '☁',
  partlyCloudy: '⛅',
  rain: '☂',
  showers: '☂',
  snow: '❄',
  snowShowers: '❄',
  thunderstorm: 'ϟ',
  thunderstormHail: 'ϟ',
  unknown: '·',
};

/**
 * Asks Open-Meteo, straight from the browser, for the weather of the saved city.
 * Runs again only when that city or the interface language changes, so it must live
 * above the profile form, which remounts on every save.
 */
export function useRestaurantWeather(savedCity: string | null): WeatherState {
  const locale = useLocale();
  const city = savedCity?.trim() ?? '';
  const key = `${locale}\n${city}`;
  const [result, setResult] = useState<{ key: string; state: WeatherState } | null>(null);

  useEffect(() => {
    if (!city) return;
    const controller = new AbortController();
    lookUpWeather(city, locale, controller.signal).then(
      (lookup) =>
        setResult({
          key,
          state:
            lookup.kind === 'found'
              ? { region: lookup.region, status: 'ready', weather: lookup.weather }
              : { status: 'not-found' },
        }),
      () => {
        if (!controller.signal.aborted) setResult({ key, state: { status: 'error' } });
      },
    );
    return () => controller.abort();
  }, [city, key, locale]);

  if (!city) return { status: 'idle' };
  return result?.key === key ? result.state : { status: 'loading' };
}

export function RestaurantWeatherCard({
  city,
  state,
}: {
  city: string | null;
  state: WeatherState;
}) {
  const locale = useLocale();
  const copy = useCopy(ownerWeatherCopy);
  const savedCity = city?.trim() ?? '';

  return (
    <Card className="p-6">
      <section aria-labelledby="restaurant-weather-title">
        <Kicker tone="teal">
          <span id="restaurant-weather-title">{copy.title}</span>
        </Kicker>
        <div aria-live="polite" className="mt-4">
          {state.status === 'idle' ? <Message>{copy.noCity}</Message> : null}
          {state.status === 'loading' ? <Message>{copy.loading}</Message> : null}
          {state.status === 'not-found' ? <Message>{copy.notFound(savedCity)}</Message> : null}
          {state.status === 'error' ? <Message>{copy.error}</Message> : null}
          {state.status === 'ready' ? (
            <div className="grid gap-1">
              <p className="m-0 flex items-baseline gap-3">
                <span aria-hidden="true" className="text-2xl text-teal">
                  {GLYPHS[state.weather.condition]}
                </span>
                <strong className="font-display text-4xl tracking-tight tabular-nums">
                  {formatNumber(Math.round(state.weather.temperature), locale)}{' '}
                  {UNIT_SYMBOLS[state.weather.unit]}
                </strong>
              </p>
              <p className="m-0 text-sm font-bold text-ink">
                {copy.conditions[state.weather.condition]}
              </p>
              <p className="m-0 text-[13px] text-ink-soft">
                <span className="sr-only">{copy.place}: </span>
                {state.region ? `${savedCity} · ${state.region}` : savedCity}
              </p>
              <p className="m-0 text-[11px] text-ink-muted">
                {copy.measuredAt(state.weather.measuredAt)}
              </p>
              {/* Required by Open-Meteo's CC BY 4.0 licence, worded exactly as it asks. */}
              <a
                className="mt-2 inline-flex min-h-11 w-fit items-center text-[11px] font-bold text-teal"
                href="https://open-meteo.com/"
                rel="noreferrer"
                target="_blank"
              >
                Weather data by Open-Meteo.com
              </a>
            </div>
          ) : null}
        </div>
      </section>
    </Card>
  );
}

function Message({ children }: { children: string }) {
  return <p className="m-0 text-[13px]/relaxed text-ink-soft">{children}</p>;
}
