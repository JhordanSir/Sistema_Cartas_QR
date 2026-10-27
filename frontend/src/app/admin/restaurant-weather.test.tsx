import { render, screen } from '@testing-library/react';

import { LocaleProvider } from '@/i18n/locale-provider';

import { RestaurantWeatherCard, useRestaurantWeather } from './restaurant-weather';

function RestaurantWeather({ city }: { city: string | null }) {
  return <RestaurantWeatherCard city={city} state={useRestaurantWeather(city)} />;
}

const LIMA = { admin1: 'Provincia de Lima', latitude: -12.04318, longitude: -77.02824, name: 'Lima' };

function forecast(temperature: number) {
  return {
    current: { is_day: 1, temperature_2m: temperature, time: '2026-09-22T15:00', weather_code: 2 },
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return { json: jest.fn().mockResolvedValue(body), ok: status < 400, status } as unknown as Response;
}

describe('RestaurantWeather', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it('pide la ciudad y no consulta nada cuando el perfil no la tiene', () => {
    render(<RestaurantWeather city={null} />);

    expect(
      screen.getByText('Agrega la ciudad de tu local para ver el clima de tu zona.'),
    ).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('muestra el clima de la ciudad guardada con la región encontrada y la atribución', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ results: [LIMA] }))
      .mockResolvedValueOnce(jsonResponse(forecast(19.6)));

    render(<RestaurantWeather city=" Lima " />);

    expect(screen.getByText('Consultando el clima…')).toBeVisible();
    expect(await screen.findByText('20 °C')).toBeVisible();
    expect(screen.getByText('Parcialmente nublado')).toBeVisible();
    expect(screen.getByText('Lima · Provincia de Lima')).toBeVisible();
    expect(screen.getByText('Medido a las 15:00 (hora local)')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Weather data by Open-Meteo.com' })).toHaveAttribute(
      'href',
      'https://open-meteo.com/',
    );
    expect(new URL(String(fetchMock.mock.calls[0]?.[0])).searchParams.get('name')).toBe('Lima');
  });

  it('avisa cuando Open-Meteo no conoce la ciudad', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ generationtime_ms: 0.1 }));

    render(<RestaurantWeather city="Barranco" />);

    expect(
      await screen.findByText('No encontramos «Barranco». Prueba solo con el distrito o la ciudad.'),
    ).toBeVisible();
    expect(screen.queryByRole('link', { name: /Open-Meteo/ })).not.toBeInTheDocument();
  });

  it('muestra un aviso sin romper el perfil cuando falla la red', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    render(<RestaurantWeather city="Lima" />);

    expect(await screen.findByText('No pudimos cargar el clima. Inténtalo más tarde.')).toBeVisible();
  });

  it('en inglés pide y muestra grados Fahrenheit, con la hora en 24 h', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ results: [{ ...LIMA, admin1: 'Lima Province' }] }))
      .mockResolvedValueOnce(jsonResponse(forecast(67.3)));

    render(
      <LocaleProvider locale="en">
        <RestaurantWeather city="Lima" />
      </LocaleProvider>,
    );

    expect(await screen.findByText('67 °F')).toBeVisible();
    expect(screen.getByText('Partly cloudy')).toBeVisible();
    expect(screen.getByText('Measured at 15:00 (local time)')).toBeVisible();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('language=en');
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('temperature_unit=fahrenheit');
  });

  it('vuelve a consultar cuando cambia la ciudad guardada', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ results: [LIMA] }))
      .mockResolvedValueOnce(jsonResponse(forecast(19)))
      .mockResolvedValueOnce(jsonResponse({ results: [{ ...LIMA, admin1: 'Departamento de Cusco' }] }))
      .mockResolvedValueOnce(jsonResponse(forecast(12)));

    const { rerender } = render(<RestaurantWeather city="Lima" />);
    expect(await screen.findByText('19 °C')).toBeVisible();

    rerender(<RestaurantWeather city="Cusco" />);
    expect(await screen.findByText('12 °C')).toBeVisible();
    expect(screen.getByText('Cusco · Departamento de Cusco')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
