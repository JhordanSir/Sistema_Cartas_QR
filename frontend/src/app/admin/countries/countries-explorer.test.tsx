import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { LocaleProvider } from '@/i18n/locale-provider';

import { CountriesExplorer } from './countries-explorer';

const router = { refresh: jest.fn(), replace: jest.fn() };

jest.mock('next/navigation', () => ({
  useRouter: () => router,
}));

const API = 'https://countries.dev';
const REGIONS = ['Africa', 'Americas', 'Antarctic', 'Antarctic Ocean', 'Asia', 'Europe', 'Oceania', 'Polar'];
const AMERICAS = [
  { alpha2Code: 'PE', alpha3Code: 'PER', name: 'Peru' },
  { alpha2Code: 'BO', alpha3Code: 'BOL', name: 'Bolivia (Plurinational State of)' },
  { alpha2Code: 'AR', alpha3Code: 'ARG', name: 'Argentina' },
];
const AFRICA = [{ alpha2Code: 'GM', alpha3Code: 'GMB', name: 'Gambia' }];
const BOLIVIA = {
  alpha2Code: 'BO',
  alpha3Code: 'BOL',
  capital: 'Sucre',
  flags: { svg: 'https://flagcdn.com/bo.svg' },
  languages: [
    { iso639_1: 'es', name: 'Spanish', nativeName: 'Español' },
    { iso639_1: 'ay', name: 'Aymara', nativeName: 'aymar aru' },
    { iso639_1: 'qu', name: 'Quechua', nativeName: 'Runa Simi' },
  ],
  name: 'Bolivia (Plurinational State of)',
  nativeName: 'Bolivia',
};

function json(body: unknown, status = 200): Response {
  return { json: () => Promise.resolve(body), ok: status < 400, status } as unknown as Response;
}

type Handler = (signal: AbortSignal) => Promise<Response>;

let fetchMock: jest.Mock;

/** Answers each countries.dev address from `routes`; anything else is a test bug. */
function serve(routes: Record<string, Handler | unknown>) {
  fetchMock = jest.fn((url: string, init: { signal: AbortSignal }) => {
    const route = routes[url.replace(API, '')];
    if (route === undefined) return Promise.reject(new Error(`Unexpected request ${url}`));
    return typeof route === 'function' ? (route as Handler)(init.signal) : Promise.resolve(json(route));
  });
  global.fetch = fetchMock;
}

/** A request that only ends when the page aborts it, as fetch does. */
function pending(seen: AbortSignal[]): Handler {
  return (signal) => {
    seen.push(signal);
    return new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    });
  };
}

const requested = () => fetchMock.mock.calls.map(([url]) => String(url).replace(API, ''));
const regionSelect = () => screen.getByRole('combobox', { name: 'Región' });
const countrySelect = () => screen.getByRole('combobox', { name: 'País' });

beforeEach(() => {
  window.localStorage.clear();
});

describe('CountriesExplorer', () => {
  it('loads the regions on entry, without the one-territory ones, named and sorted in Spanish', async () => {
    serve({ '/regions': REGIONS });
    render(<CountriesExplorer />);

    expect(regionSelect()).toBeDisabled();
    expect(regionSelect()).toHaveDisplayValue('Cargando regiones…');
    await waitFor(() => expect(regionSelect()).toBeEnabled());
    expect(within(regionSelect()).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Elige una región',
      'África',
      'América',
      'Asia',
      'Europa',
      'Oceanía',
    ]);
    expect(countrySelect()).toBeDisabled();
    expect(countrySelect()).toHaveDisplayValue('Primero elige una región');
    expect(fetchMock).toHaveBeenCalledWith(`${API}/regions`, { signal: expect.any(AbortSignal) as AbortSignal });
  });

  it('reloads the countries for the chosen region and shows the languages of the chosen country', async () => {
    serve({ '/alpha/BOL': BOLIVIA, '/region/Americas': AMERICAS, '/regions': REGIONS });
    render(<CountriesExplorer />);
    await waitFor(() => expect(regionSelect()).toBeEnabled());

    fireEvent.change(regionSelect(), { target: { value: 'Americas' } });
    expect(countrySelect()).toHaveDisplayValue('Cargando países…');
    await waitFor(() => expect(countrySelect()).toBeEnabled());
    expect(within(countrySelect()).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Elige un país',
      'Argentina',
      'Bolivia',
      'Perú',
    ]);

    fireEvent.change(countrySelect(), { target: { value: 'BOL' } });
    expect(screen.getByRole('status')).toHaveTextContent('Cargando Bolivia…');
    const table = await screen.findByRole('table', { name: 'Idiomas de Bolivia' });
    expect(
      within(table)
        .getAllByRole('row')
        .map((row) => within(row).getAllByRole(row.querySelector('th') ? 'columnheader' : 'cell').map((cell) => cell.textContent)),
    ).toEqual([
      ['Idioma', 'Nombre en su idioma'],
      ['Español', 'Español'],
      ['Aimara', 'aymar aru'],
      ['Quechua', 'Runa Simi'],
    ]);
    expect(within(table).getByText('Runa Simi')).toHaveAttribute('lang', 'qu');
    expect(screen.getByRole('heading', { level: 2, name: 'Bolivia' })).toBeVisible();
    expect(screen.getByText('Sucre')).toBeVisible();
    expect(screen.getByRole('img', { name: 'Bandera de Bolivia' })).toHaveAttribute('src', 'https://flagcdn.com/bo.svg');
    expect(requested()).toEqual(['/regions', '/region/Americas', '/alpha/BOL']);
  });

  it('cancels the call for a region the owner already left', async () => {
    const americasCalls: AbortSignal[] = [];
    serve({ '/region/Africa': AFRICA, '/region/Americas': pending(americasCalls), '/regions': REGIONS });
    render(<CountriesExplorer />);
    await waitFor(() => expect(regionSelect()).toBeEnabled());

    fireEvent.change(regionSelect(), { target: { value: 'Americas' } });
    await waitFor(() => expect(americasCalls).toHaveLength(1));
    fireEvent.change(regionSelect(), { target: { value: 'Africa' } });

    expect(americasCalls[0]?.aborted).toBe(true);
    await waitFor(() => expect(countrySelect()).toBeEnabled());
    expect(within(countrySelect()).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Elige un país',
      'Gambia',
    ]);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('says which call failed and repeats it on Reintentar', async () => {
    let attempts = 0;
    serve({
      '/regions': () => {
        attempts += 1;
        return Promise.resolve(attempts === 1 ? json('Service unavailable', 503) : json(REGIONS));
      },
    });
    render(<CountriesExplorer />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No pudimos cargar las regiones.');
    fireEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(regionSelect()).toBeEnabled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(attempts).toBe(2);
  });

  it('remembers the choice on this device and asks again in the same order', async () => {
    window.localStorage.setItem('sirio-countries-selection', JSON.stringify({ country: 'BOL', region: 'Americas' }));
    serve({ '/alpha/BOL': BOLIVIA, '/region/Africa': AFRICA, '/region/Americas': AMERICAS, '/regions': REGIONS });
    render(<CountriesExplorer />);

    expect(await screen.findByRole('table', { name: 'Idiomas de Bolivia' })).toBeVisible();
    expect(regionSelect()).toHaveDisplayValue('América');
    expect(countrySelect()).toHaveDisplayValue('Bolivia');
    expect(requested()).toEqual(['/regions', '/region/Americas', '/alpha/BOL']);

    fireEvent.change(regionSelect(), { target: { value: 'Africa' } });
    expect(JSON.parse(window.localStorage.getItem('sirio-countries-selection') ?? 'null')).toEqual({
      country: '',
      region: 'Africa',
    });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('names everything in English when the panel is in English', async () => {
    window.localStorage.setItem('sirio-countries-selection', JSON.stringify({ country: 'BOL', region: 'Americas' }));
    serve({ '/alpha/BOL': BOLIVIA, '/region/Americas': AMERICAS, '/regions': REGIONS });
    render(
      <LocaleProvider locale="en">
        <CountriesExplorer />
      </LocaleProvider>,
    );

    const table = await screen.findByRole('table', { name: 'Languages of Bolivia' });
    expect(screen.getByRole('combobox', { name: 'Region' })).toHaveDisplayValue('Americas');
    expect(within(table).getByText('Aymara')).toBeVisible();
    expect(screen.getByText('Native name:', { exact: false })).toBeVisible();
  });
});
