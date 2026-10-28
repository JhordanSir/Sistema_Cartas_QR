/**
 * @jest-environment node
 */
import {
  CountriesUnavailableError,
  countryName,
  countryUrl,
  fetchCountries,
  languageName,
  parseCountries,
  parseCountry,
  parseRegions,
  regionUrl,
} from './countries';

const BOLIVIA = {
  alpha2Code: 'BO',
  alpha3Code: 'BOL',
  capital: 'Sucre',
  flags: { png: 'https://flagcdn.com/w320/bo.png', svg: 'https://flagcdn.com/bo.svg' },
  languages: [
    { iso639_1: 'es', iso639_2: 'spa', name: 'Spanish', nativeName: 'Español' },
    { iso639_1: 'qu', iso639_2: 'que', name: 'Quechua', nativeName: 'Runa Simi' },
    { iso639_2: 'xyz', name: 'Made-up' },
    { nativeName: 'sin nombre' },
  ],
  name: 'Bolivia (Plurinational State of)',
  nativeName: 'Bolivia',
};

function json(body: unknown, status = 200): Response {
  return { json: () => Promise.resolve(body), ok: status < 400, status } as unknown as Response;
}

describe('countries.dev addresses', () => {
  it('escapes the region and the code', () => {
    expect(regionUrl('Antarctic Ocean')).toBe('https://countries.dev/region/Antarctic%20Ocean');
    expect(countryUrl('PER')).toBe('https://countries.dev/alpha/PER');
  });
});

describe('parsing', () => {
  it('keeps the regions worth choosing', () => {
    expect(parseRegions(['Africa', 'Americas', 'Antarctic', 'Antarctic Ocean', 'Asia', 'Polar', '', 4])).toEqual([
      'Africa',
      'Americas',
      'Asia',
    ]);
    expect(() => parseRegions({ regions: [] })).toThrow(CountriesUnavailableError);
  });

  it('skips countries without both codes and a name', () => {
    expect(
      parseCountries([
        { alpha2Code: 'pe', alpha3Code: 'per', name: 'Peru' },
        { alpha2Code: 'GM', name: 'Gambia' },
        { alpha2Code: 'B0', alpha3Code: 'BOL', name: 'Bolivia' },
        null,
      ]),
    ).toEqual([{ alpha2: 'PE', alpha3: 'PER', name: 'Peru' }]);
  });

  it('reads a country with its languages, flag and capital', () => {
    expect(parseCountry(BOLIVIA)).toEqual({
      alpha2: 'BO',
      alpha3: 'BOL',
      capital: 'Sucre',
      flagUrl: 'https://flagcdn.com/bo.svg',
      languages: [
        { code: 'es', name: 'Spanish', nativeName: 'Español' },
        { code: 'qu', name: 'Quechua', nativeName: 'Runa Simi' },
        { code: 'xyz', name: 'Made-up', nativeName: null },
      ],
      name: 'Bolivia (Plurinational State of)',
      nativeName: 'Bolivia',
    });
  });

  it('only takes an https flag and fails on a body that is not a country', () => {
    const plain = parseCountry({ ...BOLIVIA, capital: '', flags: { png: 'https://flagcdn.com/bo.png', svg: 'http://x.test/bo.svg' } });
    expect(plain.flagUrl).toBe('https://flagcdn.com/bo.png');
    expect(plain.capital).toBeNull();
    expect(parseCountry({ ...BOLIVIA, flags: { svg: 'javascript:alert(1)' } }).flagUrl).toBeNull();
    expect(() => parseCountry({ message: 'Country not found' })).toThrow(CountriesUnavailableError);
  });
});

describe('requests', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it('passes the abort signal along and reads the region', async () => {
    fetchMock.mockResolvedValueOnce(json([{ alpha2Code: 'PE', alpha3Code: 'PER', name: 'Peru' }]));
    const controller = new AbortController();

    await expect(fetchCountries('Americas', controller.signal)).resolves.toEqual([
      { alpha2: 'PE', alpha3: 'PER', name: 'Peru' },
    ]);
    expect(fetchMock).toHaveBeenCalledWith('https://countries.dev/region/Americas', { signal: controller.signal });
  });

  it('turns an error status into CountriesUnavailableError', async () => {
    fetchMock.mockResolvedValueOnce(json('Country not found', 404));

    await expect(fetchCountries('Atlantis')).rejects.toThrow('countries.dev answered 404');
  });
});

describe('names in the interface language', () => {
  it('names countries and languages in Spanish and in English', () => {
    expect(countryName({ alpha2: 'PE', alpha3: 'PER', name: 'Peru' }, 'es')).toBe('Perú');
    expect(countryName({ alpha2: 'PE', alpha3: 'PER', name: 'Peru' }, 'en')).toBe('Peru');
    expect(languageName({ code: 'qu', name: 'Quechua', nativeName: 'Runa Simi' }, 'es')).toBe('Quechua');
    expect(languageName({ code: 'ay', name: 'Aymara', nativeName: 'aymar aru' }, 'es')).toBe('Aimara');
    expect(languageName({ code: 'xyz', name: 'Made-up', nativeName: null }, 'es')).toBe('Made-up');
  });
});
