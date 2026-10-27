import {
  forecastUrl,
  geocodingUrl,
  lookUpWeather,
  parseCurrentWeather,
  parsePlace,
  temperatureUnit,
  WeatherUnavailableError,
  weatherCondition,
} from './weather';

const LIMA = {
  admin1: 'Provincia de Lima',
  country: 'Perú',
  latitude: -12.04318,
  longitude: -77.02824,
  name: 'Lima',
};
const FORECAST = {
  current: { interval: 900, is_day: 1, temperature_2m: 19.5, time: '2026-09-22T15:00', weather_code: 2 },
  current_units: { temperature_2m: '°C' },
};

function jsonResponse(body: unknown, status = 200): Response {
  return { json: jest.fn().mockResolvedValue(body), ok: status < 400, status } as unknown as Response;
}

describe('URLs de Open-Meteo', () => {
  it('busca la ciudad solo en Perú, con un resultado y en el idioma de la interfaz', () => {
    const url = new URL(geocodingUrl('Miraflores, Lima', 'es'));
    expect(url.origin + url.pathname).toBe('https://geocoding-api.open-meteo.com/v1/search');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      count: '1',
      countryCode: 'PE',
      format: 'json',
      language: 'es',
      name: 'Miraflores, Lima',
    });
  });

  it('pide el clima actual en la unidad elegida y con la hora local del lugar', () => {
    const url = new URL(forecastUrl({ latitude: -12.04, longitude: -77.03 }, 'fahrenheit'));
    expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      current: 'temperature_2m,weather_code,is_day',
      latitude: '-12.04',
      longitude: '-77.03',
      temperature_unit: 'fahrenheit',
      timezone: 'auto',
    });
  });

  it('usa °C en español y °F en inglés', () => {
    expect(temperatureUnit('es')).toBe('celsius');
    expect(temperatureUnit('en')).toBe('fahrenheit');
  });
});

describe('weatherCondition', () => {
  it('agrupa los códigos WMO en condiciones legibles', () => {
    expect(weatherCondition(0)).toBe('clear');
    expect(weatherCondition(2)).toBe('partlyCloudy');
    expect(weatherCondition(45)).toBe('fog');
    expect(weatherCondition(63)).toBe('rain');
    expect(weatherCondition(81)).toBe('showers');
    expect(weatherCondition(99)).toBe('thunderstormHail');
  });

  it('no inventa una condición para un código que no conoce', () => {
    expect(weatherCondition(42)).toBe('unknown');
  });
});

describe('parsePlace', () => {
  it('toma las coordenadas y la región del primer resultado', () => {
    expect(parsePlace({ results: [LIMA] })).toEqual({
      latitude: -12.04318,
      longitude: -77.02824,
      region: 'Provincia de Lima',
    });
  });

  it('usa el país cuando el resultado no trae región', () => {
    expect(parsePlace({ results: [{ ...LIMA, admin1: '' }] })?.region).toBe('Perú');
  });

  it('devuelve null cuando no hay resultados o faltan coordenadas', () => {
    expect(parsePlace({ generationtime_ms: 0.1 })).toBeNull();
    expect(parsePlace({ results: [] })).toBeNull();
    expect(parsePlace({ results: [{ ...LIMA, latitude: 'x' }] })).toBeNull();
    expect(parsePlace(null)).toBeNull();
  });
});

describe('parseCurrentWeather', () => {
  it('lee temperatura, condición, día y la hora local de la medición', () => {
    expect(parseCurrentWeather(FORECAST, 'celsius')).toEqual({
      condition: 'partlyCloudy',
      isDay: true,
      measuredAt: '15:00',
      temperature: 19.5,
      unit: 'celsius',
    });
  });

  it('rechaza una respuesta con otra forma', () => {
    expect(() => parseCurrentWeather({}, 'celsius')).toThrow(WeatherUnavailableError);
    expect(() =>
      parseCurrentWeather({ current: { ...FORECAST.current, temperature_2m: null } }, 'celsius'),
    ).toThrow(WeatherUnavailableError);
    expect(() =>
      parseCurrentWeather({ current: { ...FORECAST.current, time: 'ayer' } }, 'celsius'),
    ).toThrow(WeatherUnavailableError);
  });
});

describe('lookUpWeather', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it('geocodifica la ciudad y luego pide el clima de esas coordenadas', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ results: [LIMA] }))
      .mockResolvedValueOnce(jsonResponse(FORECAST));

    await expect(lookUpWeather('Lima', 'es')).resolves.toEqual({
      kind: 'found',
      region: 'Provincia de Lima',
      weather: expect.objectContaining({ condition: 'partlyCloudy', temperature: 19.5 }),
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('latitude=-12.04318');
  });

  it('no pide el clima cuando la ciudad no existe', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ generationtime_ms: 0.1 }));

    await expect(lookUpWeather('Ciudad inventada', 'es')).resolves.toEqual({ kind: 'not-found' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falla con un error propio si Open-Meteo responde con un estado de error', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ reason: 'Too many requests' }, 429));

    await expect(lookUpWeather('Lima', 'es')).rejects.toBeInstanceOf(WeatherUnavailableError);
  });

  it('propaga la cancelación a las dos peticiones', async () => {
    const controller = new AbortController();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ results: [LIMA] }))
      .mockResolvedValueOnce(jsonResponse(FORECAST));

    await lookUpWeather('Lima', 'en', controller.signal);
    expect(fetchMock.mock.calls.map(([, init]) => (init as RequestInit).signal)).toEqual([
      controller.signal,
      controller.signal,
    ]);
  });
});
