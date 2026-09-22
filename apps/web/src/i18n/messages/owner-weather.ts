import type { WeatherCondition } from '@/lib/weather';

import type { Locale } from '../locale';

/** The weather card on the owner's profile. The city itself is the owner's text. */
interface OwnerWeatherCopy {
  conditions: Record<WeatherCondition, string>;
  error: string;
  loading: string;
  measuredAt: (time: string) => string;
  noCity: string;
  notFound: (city: string) => string;
  place: string;
  title: string;
}

export const ownerWeatherCopy: Record<Locale, OwnerWeatherCopy> = {
  en: {
    conditions: {
      clear: 'Clear sky',
      drizzle: 'Drizzle',
      fog: 'Fog',
      freezingDrizzle: 'Freezing drizzle',
      freezingRain: 'Freezing rain',
      mainlyClear: 'Mainly clear',
      overcast: 'Overcast',
      partlyCloudy: 'Partly cloudy',
      rain: 'Rain',
      showers: 'Rain showers',
      snow: 'Snow',
      snowShowers: 'Snow showers',
      thunderstorm: 'Thunderstorm',
      thunderstormHail: 'Thunderstorm with hail',
      unknown: 'Unknown conditions',
    },
    error: "We couldn't load the weather. Try again later.",
    loading: 'Checking the weather…',
    measuredAt: (time) => `Measured at ${time} (local time)`,
    noCity: "Add your restaurant's city to see the local weather.",
    notFound: (city) => `We couldn't find “${city}”. Try just the district or city.`,
    place: 'Place found',
    title: 'Weather now',
  },
  es: {
    conditions: {
      clear: 'Despejado',
      drizzle: 'Llovizna',
      fog: 'Niebla',
      freezingDrizzle: 'Llovizna helada',
      freezingRain: 'Lluvia helada',
      mainlyClear: 'Mayormente despejado',
      overcast: 'Nublado',
      partlyCloudy: 'Parcialmente nublado',
      rain: 'Lluvia',
      showers: 'Chubascos',
      snow: 'Nieve',
      snowShowers: 'Chubascos de nieve',
      thunderstorm: 'Tormenta',
      thunderstormHail: 'Tormenta con granizo',
      unknown: 'Condición desconocida',
    },
    error: 'No pudimos cargar el clima. Inténtalo más tarde.',
    loading: 'Consultando el clima…',
    measuredAt: (time) => `Medido a las ${time} (hora local)`,
    noCity: 'Agrega la ciudad de tu local para ver el clima de tu zona.',
    notFound: (city) => `No encontramos «${city}». Prueba solo con el distrito o la ciudad.`,
    place: 'Lugar encontrado',
    title: 'Clima ahora',
  },
};
