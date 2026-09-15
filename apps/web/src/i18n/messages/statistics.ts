import type { Locale } from '../locale';

type StatisticsScope = 'backoffice' | 'owner';

/** The statistics screen, shared by the owner panel and the backoffice. */
interface StatisticsCopy {
  barLabel: (label: string, total: string, average: string) => string;
  chartNote: string;
  daily: string;
  empty: { body: string; title: string };
  footnote: string;
  hourly: string;
  intro: Record<StatisticsScope, { kicker: string; lede: string }>;
  loadRestaurantsError: string;
  loadStatisticsError: string;
  loading: string;
  metricUnit: string;
  noReadings: string;
  peak: (day: string, hour: string) => string;
  periods: { allTime: string; last30Days: string; last7Days: string };
  rhythms: string;
  timeZone: string;
  title: string;
  uniqueViews: string;
  /** Sunday first, matching the API's dayOfWeek. Full names for the peak sentence. */
  weekdayPhrases: readonly string[];
  /** Sunday first. Short enough for the chart axis. */
  weekdays: readonly string[];
}

export const statisticsCopy: Record<Locale, StatisticsCopy> = {
  en: {
    barLabel: (label, total, average) => `${label}: ${total} views, ${average} on average`,
    chartNote: 'Daily average over the full history',
    daily: 'Daily rhythm',
    empty: {
      body: 'Create or assign a restaurant to start receiving menu data.',
      title: 'No restaurants to analyze',
    },
    footnote:
      'The same person only counts once a day. Averages include the days without visits since the first recorded one.',
    hourly: 'Hourly rhythm',
    intro: {
      backoffice: {
        kicker: 'Platform overview',
        lede: 'Check how every menu is doing and spot the restaurants that need attention.',
      },
      owner: {
        kicker: 'Your menu at a glance',
        lede: 'Each visit counts once per person per day, always in Peru time.',
      },
    },
    loadRestaurantsError: "We couldn't load the restaurants. Please try again.",
    loadStatisticsError: "We couldn't load the statistics. Please try again.",
    loading: 'Loading statistics',
    metricUnit: 'unique views',
    noReadings:
      "Nobody has opened this QR code yet. Once someone opens the menu, its activity will show up here.",
    peak: (day, hour) => `Activity peaks ${day} at ${hour}.`,
    periods: { allTime: 'All time', last30Days: 'Last 30 days', last7Days: 'Last 7 days' },
    rhythms: 'Visit rhythms',
    timeZone: 'Peru time · UTC−5',
    title: 'Statistics',
    uniqueViews: 'Unique views',
    weekdayPhrases: [
      'on Sundays',
      'on Mondays',
      'on Tuesdays',
      'on Wednesdays',
      'on Thursdays',
      'on Fridays',
      'on Saturdays',
    ],
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  },
  es: {
    barLabel: (label, total, average) => `${label}: ${total} vistas, promedio ${average}`,
    chartNote: 'Promedio diario del historial',
    daily: 'Ritmo por día',
    empty: {
      body: 'Crea o asigna un restaurante para empezar a recibir datos de sus cartas.',
      title: 'No hay restaurantes para analizar',
    },
    footnote:
      'Una misma persona solo cuenta una vez al día. Los promedios incluyen los días sin lecturas desde la primera visita registrada.',
    hourly: 'Ritmo por hora',
    intro: {
      backoffice: {
        kicker: 'Panorama de la plataforma',
        lede: 'Consulta el movimiento de cada carta y detecta los locales que necesitan atención.',
      },
      owner: {
        kicker: 'Lecturas de tu carta',
        lede: 'Cada visita cuenta una vez por persona y día, siempre en hora de Perú.',
      },
    },
    loadRestaurantsError: 'No pudimos cargar los restaurantes. Vuelve a intentarlo.',
    loadStatisticsError: 'No pudimos cargar las estadísticas. Vuelve a intentarlo.',
    loading: 'Cargando estadísticas',
    metricUnit: 'vistas únicas',
    noReadings:
      'Aún no hay lecturas de este QR. Cuando alguien abra la carta, el pulso aparecerá aquí.',
    peak: (day, hour) => `El mayor movimiento llega ${day} a las ${hour}.`,
    periods: {
      allTime: 'Desde el inicio',
      last30Days: 'Últimos 30 días',
      last7Days: 'Últimos 7 días',
    },
    rhythms: 'Ritmos de visita',
    timeZone: 'Hora de Perú · UTC−5',
    title: 'Estadísticas',
    uniqueViews: 'Vistas únicas',
    weekdayPhrases: [
      'los domingos',
      'los lunes',
      'los martes',
      'los miércoles',
      'los jueves',
      'los viernes',
      'los sábados',
    ],
    weekdays: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  },
};
