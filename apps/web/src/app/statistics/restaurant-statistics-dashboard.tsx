'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AppShell, PageTitle, SupportingCopy, Workspace, WorkspaceHeader } from '@/components/app-shell';
import { RestaurantSwitcher } from '@/components/restaurant-switcher';
import { Card, ErrorBanner, Kicker, Skeleton } from '@/components/surfaces';
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
    <AppShell
      navigation={
        scope === 'owner' ? (
          <OwnerNavigation active="statistics" />
        ) : (
          <BackofficeNavigation active="statistics" />
        )
      }
    >
      <Workspace className="max-w-[80rem]">
        <WorkspaceHeader
          actions={
            <RestaurantSwitcher
              onChange={(event) => setSelectedId(event.target.value)}
              restaurants={restaurants}
              selectedId={selectedId}
            />
          }
        >
          <Kicker>
            {scope === 'owner' ? 'Lecturas de tu carta' : 'Panorama de la plataforma'}
          </Kicker>
          <PageTitle>Estadísticas</PageTitle>
          <SupportingCopy>
            {scope === 'owner'
              ? 'Cada visita cuenta una vez por persona y día, siempre en hora de Perú.'
              : 'Consulta el movimiento de cada carta y detecta los locales que necesitan atención.'}
          </SupportingCopy>
        </WorkspaceHeader>

        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        {loadingRestaurants || loadingStatistics ? (
          <div
            aria-label="Cargando estadísticas"
            className="grid gap-3.5 sm:grid-cols-3"
            role="status"
          >
            <Skeleton className="min-h-38" />
            <Skeleton className="min-h-38" />
            <Skeleton className="min-h-38" />
          </div>
        ) : null}
        {!loadingRestaurants && restaurants.length === 0 ? (
          <Card className="grid min-h-64 content-center justify-items-center p-10 text-center">
            <span
              aria-hidden="true"
              className="grid size-14 -rotate-6 place-items-center rounded-full border border-line-strong font-display text-xl font-bold text-copper"
            >
              ◔
            </span>
            <h2 className="mt-5 mb-0 font-display text-2xl tracking-tight">
              No hay restaurantes para analizar
            </h2>
            <p className="mt-1.5 mb-0 text-[13px]/relaxed text-ink-soft">
              Crea o asigna un restaurante para empezar a recibir datos de sus cartas.
            </p>
          </Card>
        ) : null}
        {!loadingRestaurants && selected && statistics ? (
          <StatisticsReport restaurant={selected} statistics={statistics} />
        ) : null}
      </Workspace>
    </AppShell>
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
    <div className="grid gap-6">
      <section
        aria-labelledby="statistics-restaurant-title"
        className="flex flex-col gap-4 rounded-xl border-l-4 border-l-copper bg-paper-raised p-6 shadow-soft sm:p-8 md:flex-row md:items-end md:justify-between"
      >
        <div className="min-w-0">
          <Kicker tone="copper">/{restaurant.slug}</Kicker>
          <h2
            className="my-2 font-display text-3xl leading-none font-semibold tracking-[-0.04em] text-balance break-words text-ink sm:text-4xl"
            id="statistics-restaurant-title"
          >
            {restaurant.name}
          </h2>
          <p className="m-0 max-w-[60ch] text-sm/relaxed text-ink-soft text-pretty">
            {isEmpty
              ? 'Aún no hay lecturas de este QR. Cuando alguien abra la carta, el pulso aparecerá aquí.'
              : `El mayor movimiento llega ${weekdayPhrase(busiestDay?.dayOfWeek)} a las ${formatHour(busiestHour?.hour)}.`}
          </p>
        </div>
        <span className="shrink-0 self-start rounded-full bg-olive-wash px-2.5 py-1.5 text-[11px] font-bold whitespace-nowrap text-olive md:self-end">
          Hora de Perú · UTC−5
        </span>
      </section>

      <section aria-label="Vistas únicas" className="grid gap-3.5 sm:grid-cols-3">
        <Metric label="Últimos 7 días" value={statistics.uniqueViews.last7Days} />
        <Metric featured label="Últimos 30 días" value={statistics.uniqueViews.last30Days} />
        <Metric label="Desde el inicio" value={statistics.uniqueViews.allTime} />
      </section>

      <section
        aria-label="Ritmos de visita"
        className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(18.75rem,0.65fr)]"
      >
        <RhythmChart
          entries={statistics.hourly}
          label={(entry) =>
            `${formatHour(entry.hour)}: ${entry.totalViews} vistas, promedio ${entry.averageViews}`
          }
          number="01"
          tick={(entry) => formatHour(entry.hour).slice(0, 2)}
          title="Ritmo por hora"
          wide
        />
        <RhythmChart
          entries={statistics.weekdays}
          label={(entry) =>
            `${WEEKDAY_LABELS[entry.dayOfWeek]}: ${entry.totalViews} vistas, promedio ${entry.averageViews}`
          }
          number="02"
          tick={(entry) => WEEKDAY_LABELS[entry.dayOfWeek] ?? ''}
          title="Ritmo por día"
        />
      </section>
      <p className="m-0 text-xs/relaxed text-ink-muted text-pretty">
        Una misma persona solo cuenta una vez al día. Los promedios incluyen los días sin lecturas
        desde la primera visita registrada.
      </p>
    </div>
  );
}

function Metric({
  featured = false,
  label,
  value,
}: {
  featured?: boolean;
  label: string;
  value: number;
}) {
  return (
    <article
      className={`relative grid min-h-38 content-between overflow-hidden rounded-xl p-5 shadow-soft ${
        featured ? 'bg-ink' : 'bg-paper'
      }`}
    >
      {featured ? (
        <span
          aria-hidden="true"
          className="absolute -right-5 -bottom-8 size-33 rounded-full border border-white/20"
        />
      ) : null}
      <span
        className={`text-[10px] font-bold tracking-[0.09em] uppercase ${
          featured ? 'text-white/70' : 'text-ink-muted'
        }`}
      >
        {label}
      </span>
      <strong
        className={`font-display text-4xl leading-[0.9] font-semibold tracking-[-0.05em] tabular-nums sm:text-5xl ${
          featured ? 'text-paper' : 'text-ink'
        }`}
      >
        {new Intl.NumberFormat('es-PE').format(value)}
      </strong>
      <small
        className={`text-[10px] font-bold tracking-[0.09em] uppercase ${
          featured ? 'text-white/70' : 'text-ink-muted'
        }`}
      >
        vistas únicas
      </small>
    </article>
  );
}

function RhythmChart<T extends { averageViews: number; totalViews: number }>({
  entries,
  label,
  number,
  tick,
  title,
  wide = false,
}: {
  entries: T[];
  label: (entry: T) => string;
  number: string;
  tick: (entry: T) => string;
  title: string;
  wide?: boolean;
}) {
  const maximum = Math.max(...entries.map((entry) => entry.totalViews), 1);
  const titleId = `${title.toLowerCase().replaceAll(' ', '-')}-title`;
  return (
    <Card aria-labelledby={titleId} className="min-w-0 p-5 sm:p-7">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-olive-wash font-display text-[13px] font-extrabold text-olive">
            {number}
          </span>
          <h2
            className="m-0 font-display text-xl font-semibold tracking-[-0.03em] text-ink sm:text-2xl"
            id={titleId}
          >
            {title}
          </h2>
        </div>
        <p className="m-0 text-[11px]/snug text-ink-muted sm:text-right">
          Promedio diario del historial
        </p>
      </header>
      {/*
        The 24-hour series cannot fit a 390px screen. It scrolls inside its own
        container so the page itself never scrolls sideways.
      */}
      <div className="no-scrollbar -mx-1 overflow-x-auto px-1 pt-7">
        <div
          aria-label={title}
          className={`grid min-h-49 items-end gap-1.5 ${
            wide ? 'min-w-[34rem] grid-cols-24' : 'grid-cols-7 gap-2.5'
          }`}
          role="img"
        >
          {entries.map((entry, index) => (
            <div
              className="grid h-41 min-w-0 grid-rows-[1fr_1.25rem] items-end gap-1.5 text-center"
              key={index}
              title={label(entry)}
            >
              <span className="flex h-full items-end overflow-hidden rounded-t-md bg-control">
                <i
                  className="block w-full rounded-t-md bg-copper transition-[height] duration-200 ease-soft"
                  style={{
                    height: `${Math.max((entry.totalViews / maximum) * 100, entry.totalViews > 0 ? 7 : 0)}%`,
                  }}
                />
              </span>
              <small className="overflow-hidden text-[9px] font-bold whitespace-nowrap text-ink-muted tabular-nums">
                {tick(entry)}
              </small>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function strongest<T>(items: T[], value: (item: T) => number): T | undefined {
  return items.reduce<T | undefined>(
    (best, item) => (!best || value(item) > value(best) ? item : best),
    undefined,
  );
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
