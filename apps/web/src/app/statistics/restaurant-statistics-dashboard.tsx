'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import type {
  PaginatedRestaurants,
  RestaurantProfile,
  RestaurantViewStatistics,
} from '@/lib/restaurant-types';

import { OwnerNavigation } from '../admin/owner-navigation';
import { BackofficeNavigation } from '../backoffice/backoffice-navigation';

type StatisticsScope = 'backoffice' | 'owner';

interface RestaurantOption {
  id: string;
  name: string;
  slug: string;
}

const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function RestaurantStatisticsDashboard({ scope }: { scope: StatisticsScope }) {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [statistics, setStatistics] = useState<RestaurantViewStatistics | null>(null);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [loadingStatistics, setLoadingStatistics] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = useMemo(
    () => restaurants.find((restaurant) => restaurant.id === selectedId) ?? null,
    [restaurants, selectedId],
  );

  const loadRestaurants = useCallback(async () => {
    setLoadingRestaurants(true);
    setError(null);
    const response = await fetch(
      scope === 'owner'
        ? '/api/owner/restaurants'
        : '/api/backoffice/restaurants?page=1&pageSize=100',
      { cache: 'no-store' },
    );
    if (response.status === 401 || response.status === 403) {
      router.replace(scope === 'owner' ? '/admin/login' : '/login');
      return;
    }
    if (!response.ok) {
      setError('No pudimos cargar los restaurantes. Vuelve a intentarlo.');
      setLoadingRestaurants(false);
      return;
    }
    const data = (await response.json()) as RestaurantProfile[] | PaginatedRestaurants;
    const options = Array.isArray(data)
      ? data.map(toOwnerOption)
      : data.items.map(toBackofficeOption);
    setRestaurants(options);
    setSelectedId((current) => current || options[0]?.id || '');
    setLoadingRestaurants(false);
  }, [router, scope]);

  const loadStatistics = useCallback(async () => {
    if (!selectedId) return;
    setLoadingStatistics(true);
    setError(null);
    const response = await fetch(
      `/api/${scope}/restaurants/${encodeURIComponent(selectedId)}/statistics`,
      { cache: 'no-store' },
    );
    if (response.status === 401 || response.status === 403) {
      router.replace(scope === 'owner' ? '/admin/login' : '/login');
      return;
    }
    if (!response.ok) {
      setError('No pudimos cargar las estadísticas. Vuelve a intentarlo.');
      setLoadingStatistics(false);
      return;
    }
    setStatistics((await response.json()) as RestaurantViewStatistics);
    setLoadingStatistics(false);
  }, [router, scope, selectedId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadRestaurants(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadRestaurants]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadStatistics(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadStatistics]);

  return (
    <main className="backoffice-shell statistics-shell">
      {scope === 'owner'
        ? <OwnerNavigation active="statistics" />
        : <BackofficeNavigation active="statistics" />}
      <section className="workspace owner-workspace statistics-workspace">
        <header className="workspace-header owner-workspace-header">
          <div>
            <span className="kicker">{scope === 'owner' ? 'Lecturas de tu carta' : 'Panorama de la plataforma'}</span>
            <h1>Estadísticas</h1>
            <p className="supporting-copy">
              {scope === 'owner'
                ? 'Cada visita cuenta una vez por persona y día, siempre en hora de Perú.'
                : 'Consulta el movimiento de cada carta y detecta los locales que necesitan atención.'}
            </p>
          </div>
          {restaurants.length > 1 ? (
            <label className="restaurant-switcher">
              <span>Restaurante</span>
              <select onChange={(event) => setSelectedId(event.target.value)} value={selectedId}>
                {restaurants.map((restaurant) => (
                  <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
                ))}
              </select>
            </label>
          ) : null}
        </header>

        {error ? <div className="error-banner" role="alert">{error}</div> : null}
        {loadingRestaurants || loadingStatistics ? <StatisticsSkeleton /> : null}
        {!loadingRestaurants && restaurants.length === 0 ? <StatisticsEmpty /> : null}
        {!loadingRestaurants && selected && statistics ? (
          <StatisticsReport restaurant={selected} statistics={statistics} />
        ) : null}
      </section>
    </main>
  );
}

function StatisticsReport({
  restaurant,
  statistics,
}: {
  restaurant: RestaurantOption;
  statistics: RestaurantViewStatistics;
}) {
  const busiestHour = strongest(statistics.hourly, (item) => item.totalViews);
  const busiestDay = strongest(statistics.weekdays, (item) => item.totalViews);
  const isEmpty = statistics.uniqueViews.allTime === 0;

  return (
    <div className="statistics-report">
      <section className="statistics-lede" aria-labelledby="statistics-restaurant-title">
        <div>
          <span className="ticket-number">/{restaurant.slug}</span>
          <h2 id="statistics-restaurant-title">{restaurant.name}</h2>
          <p>
            {isEmpty
              ? 'Aún no hay lecturas de este QR. Cuando alguien abra la carta, el pulso aparecerá aquí.'
              : `El mayor movimiento llega ${weekdayPhrase(busiestDay?.dayOfWeek)} a las ${formatHour(busiestHour?.hour)}.`}
          </p>
        </div>
        <span className="statistics-timezone">Hora de Perú · UTC−5</span>
      </section>

      <section className="statistics-totals" aria-label="Vistas únicas">
        <Metric label="Últimos 7 días" value={statistics.uniqueViews.last7Days} />
        <Metric featured label="Últimos 30 días" value={statistics.uniqueViews.last30Days} />
        <Metric label="Desde el inicio" value={statistics.uniqueViews.allTime} />
      </section>

      <section className="statistics-rhythm-grid" aria-label="Ritmos de visita">
        <RhythmChart
          entries={statistics.hourly}
          label={(entry) => `${formatHour(entry.hour)}: ${entry.totalViews} vistas, promedio ${entry.averageViews}`}
          tick={(entry) => formatHour(entry.hour).slice(0, 2)}
          title="Ritmo por hora"
        />
        <RhythmChart
          entries={statistics.weekdays}
          label={(entry) => `${WEEKDAY_LABELS[entry.dayOfWeek]}: ${entry.totalViews} vistas, promedio ${entry.averageViews}`}
          tick={(entry) => WEEKDAY_LABELS[entry.dayOfWeek] ?? ''}
          title="Ritmo por día"
        />
      </section>
      <p className="statistics-note">
        Una misma persona solo cuenta una vez al día. Los promedios incluyen los días sin lecturas desde la primera visita registrada.
      </p>
    </div>
  );
}

function Metric({ featured = false, label, value }: { featured?: boolean; label: string; value: number }) {
  return (
    <article className={`statistics-metric${featured ? ' statistics-metric-featured' : ''}`}>
      <span>{label}</span>
      <strong>{new Intl.NumberFormat('es-PE').format(value)}</strong>
      <small>vistas únicas</small>
    </article>
  );
}

function RhythmChart<T extends { averageViews: number; totalViews: number }>({
  entries,
  label,
  tick,
  title,
}: {
  entries: T[];
  label: (entry: T) => string;
  tick: (entry: T) => string;
  title: string;
}) {
  const maximum = Math.max(...entries.map((entry) => entry.totalViews), 1);
  return (
    <section className="rhythm-card" aria-labelledby={`${title.toLowerCase().replaceAll(' ', '-')}-title`}>
      <header>
        <div>
          <span className="section-number">01</span>
          <h2 id={`${title.toLowerCase().replaceAll(' ', '-')}-title`}>{title}</h2>
        </div>
        <p>Promedio diario del historial</p>
      </header>
      <div className={`rhythm-chart rhythm-chart-${entries.length}`} role="img" aria-label={title}>
        {entries.map((entry, index) => (
          <div className="rhythm-column" key={index} title={label(entry)}>
            <span className="rhythm-bar-wrap">
              <i style={{ height: `${Math.max((entry.totalViews / maximum) * 100, entry.totalViews > 0 ? 7 : 0)}%` }} />
            </span>
            <small>{tick(entry)}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatisticsSkeleton() {
  return <div className="statistics-skeleton" aria-label="Cargando estadísticas" role="status"><span /><span /><span /></div>;
}

function StatisticsEmpty() {
  return (
    <section className="profile-empty">
      <span className="empty-stamp" aria-hidden="true">◔</span>
      <h2>No hay restaurantes para analizar</h2>
      <p>Crea o asigna un restaurante para empezar a recibir datos de sus cartas.</p>
    </section>
  );
}

function strongest<T>(items: T[], value: (item: T) => number): T | undefined {
  return items.reduce<T | undefined>((best, item) => !best || value(item) > value(best) ? item : best, undefined);
}

function formatHour(hour: number | undefined): string {
  return `${String(hour ?? 0).padStart(2, '0')}:00`;
}

function weekdayPhrase(dayOfWeek: number | undefined): string {
  const label = WEEKDAY_LABELS[dayOfWeek ?? 0] ?? 'el día';
  return label === 'Dom' ? 'el domingo' : `los ${label.toLowerCase()}`;
}

function toOwnerOption(restaurant: RestaurantProfile): RestaurantOption {
  return { id: restaurant.id, name: restaurant.name, slug: restaurant.slug };
}

function toBackofficeOption(restaurant: PaginatedRestaurants['items'][number]): RestaurantOption {
  return { id: restaurant.id, name: restaurant.name, slug: restaurant.slug };
}
