import type { Locale } from '../locale';

/**
 * /admin/countries and its card on the profile. Country and language names are not
 * here: the browser gives them in the interface language. Continents are, because
 * Chrome has no names for their UN M.49 codes.
 */
interface OwnerCountriesCopy {
  back: string;
  card: { action: string; body: string; title: string };
  country: { error: string; label: string; loading: string; placeholder: string; waiting: string };
  detail: {
    capital: string;
    error: (country: string) => string;
    flag: (country: string) => string;
    language: string;
    languageNative: string;
    languages: (country: string) => string;
    loading: (country: string) => string;
    nativeName: string;
    noCapital: string;
    noLanguages: string;
  };
  kicker: string;
  lede: string;
  region: { error: string; label: string; loading: string; placeholder: string };
  /** Keyed by the name countries.dev uses; a region missing here keeps that name. */
  regions: { Africa: string; Americas: string; Asia: string; Europe: string; Oceania: string };
  retry: string;
  source: string;
  title: string;
}

export const ownerCountriesCopy: Record<Locale, OwnerCountriesCopy> = {
  en: {
    back: 'Back to Profile',
    card: {
      action: 'Explore countries',
      body: 'Languages and native name of any country, fetched by your browser from a public API.',
      title: 'Countries of the world',
    },
    country: {
      error: "We couldn't load this region's countries.",
      label: 'Country',
      loading: 'Loading countries…',
      placeholder: 'Choose a country',
      waiting: 'Choose a region first',
    },
    detail: {
      capital: 'Capital',
      error: (country) => `We couldn't load ${country}.`,
      flag: (country) => `Flag of ${country}`,
      language: 'Language',
      languageNative: 'Name in that language',
      languages: (country) => `Languages of ${country}`,
      loading: (country) => `Loading ${country}…`,
      nativeName: 'Native name',
      noCapital: 'No capital',
      noLanguages: 'The API lists no languages for this country.',
    },
    kicker: 'Async calls',
    lede: 'Pick a region, then a country. Each list arrives from countries.dev while the page keeps responding.',
    region: {
      error: "We couldn't load the regions.",
      label: 'Region',
      loading: 'Loading regions…',
      placeholder: 'Choose a region',
    },
    regions: { Africa: 'Africa', Americas: 'Americas', Asia: 'Asia', Europe: 'Europe', Oceania: 'Oceania' },
    retry: 'Try again',
    source: 'Data from countries.dev, requested by your browser.',
    title: 'Countries and languages',
  },
  es: {
    back: 'Volver a Perfil',
    card: {
      action: 'Explorar países',
      body: 'Idiomas y nombre nativo de cualquier país, pedidos por tu navegador a una API pública.',
      title: 'Países del mundo',
    },
    country: {
      error: 'No pudimos cargar los países de esta región.',
      label: 'País',
      loading: 'Cargando países…',
      placeholder: 'Elige un país',
      waiting: 'Primero elige una región',
    },
    detail: {
      capital: 'Capital',
      error: (country) => `No pudimos cargar ${country}.`,
      flag: (country) => `Bandera de ${country}`,
      language: 'Idioma',
      languageNative: 'Nombre en su idioma',
      languages: (country) => `Idiomas de ${country}`,
      loading: (country) => `Cargando ${country}…`,
      nativeName: 'Nombre nativo',
      noCapital: 'Sin capital',
      noLanguages: 'La API no registra idiomas para este país.',
    },
    kicker: 'Llamadas asíncronas',
    lede: 'Elige una región y luego un país. Cada lista llega de countries.dev mientras la página sigue respondiendo.',
    region: {
      error: 'No pudimos cargar las regiones.',
      label: 'Región',
      loading: 'Cargando regiones…',
      placeholder: 'Elige una región',
    },
    regions: { Africa: 'África', Americas: 'América', Asia: 'Asia', Europe: 'Europa', Oceania: 'Oceanía' },
    retry: 'Reintentar',
    source: 'Datos de countries.dev, pedidos por tu navegador.',
    title: 'Países e idiomas',
  },
};
