import type { Metadata } from 'next';

import { ButtonLink } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Card } from '@/components/ui/surfaces';
import { requireOwnerPage } from '@/server/next/page-auth';
import { getViewStatistics } from '@/server/views';
import {
  EMPTY_STATISTICS_MESSAGE,
  formatAverage,
  formatHour,
  peakSentence,
  type RhythmBar,
  WEEK_ORDER,
  WEEKDAY_NAMES,
  WEEKDAY_SHORT_NAMES,
} from '@/shared/view-statistics';

import { ScrollRegion } from './scroll-region';

export const metadata: Metadata = { title: 'Estadísticas' };

const countFormat = new Intl.NumberFormat('es-PE');

function visits(count: number): string {
  return `${countFormat.format(count)} ${count === 1 ? 'visita' : 'visitas'}`;
}

/** Unique visits to the public menu, in Lima time (§E11). */
export default async function StatisticsPage() {
  const { restaurant } = await requireOwnerPage();
  const statistics = await getViewStatistics(restaurant.id);

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="m-0 font-display text-3xl font-semibold tracking-tight">Estadísticas</h1>
        <p className="m-0 text-[15px] text-ink-soft">
          Visitas a tu carta pública. Cada persona cuenta una vez al día, y las horas son de Lima.
        </p>
      </div>

      {statistics.peak === null ? (
        <Card className="grid justify-items-start gap-4 p-6">
          <p className="m-0 text-[17px]">{EMPTY_STATISTICS_MESSAGE}</p>
          <ButtonLink href="/panel/qr" variant="secondary">
            Ver mi código QR
          </ButtonLink>
        </Card>
      ) : (
        <>
          <dl className="m-0 grid gap-3 sm:grid-cols-3">
            <Figure label="Últimos 7 días" value={statistics.last7Days} />
            <Figure label="Últimos 30 días" value={statistics.last30Days} />
            <Figure label="Desde el inicio" value={statistics.allTime} />
          </dl>

          <p className="m-0 font-display text-xl leading-snug font-semibold text-wine">
            {peakSentence(statistics.peak)}
          </p>

          <RhythmChart
            bars={statistics.hours.map((bar, hour) => ({
              bar,
              isPeak: hour === statistics.peak?.hour,
              label: formatHour(hour),
              name: formatHour(hour),
            }))}
            note="Promedio de visitas por día en cada hora, desde tu primera visita."
            scrollable
            title="Por hora"
          />
          <RhythmChart
            bars={WEEK_ORDER.map((weekday) => ({
              bar: statistics.weekdays[weekday] ?? { average: 0, total: 0 },
              label: WEEKDAY_SHORT_NAMES[weekday],
              name: WEEKDAY_NAMES[weekday],
            }))}
            note="Promedio de visitas de cada día de la semana, desde tu primera visita."
            title="Por día de la semana"
          />
        </>
      )}
    </div>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid gap-1 rounded-card border border-line bg-raised px-5 py-4 shadow-card">
      <dt className="text-sm font-semibold text-ink-soft">{label}</dt>
      <dd className="m-0 font-display text-4xl font-semibold tabular-nums">{countFormat.format(value)}</dd>
    </div>
  );
}

type ChartBar = { bar: RhythmBar; isPeak?: boolean; label: string; name: string };

/** Bars in plain CSS; each one also reads its numbers to screen readers. */
function RhythmChart({
  bars,
  note,
  scrollable = false,
  title,
}: {
  bars: ChartBar[];
  note: string;
  scrollable?: boolean;
  title: string;
}) {
  const highest = Math.max(0, ...bars.map(({ bar }) => bar.average));
  const list = (
    <ol
      className={cn(
        'm-0 flex h-52 list-none items-stretch gap-1 border-b border-line p-0',
        // Wide enough for every bar: the region around it scrolls instead.
        scrollable && 'w-max min-w-full',
      )}
    >
      {bars.map(({ bar, isPeak, label, name }) => (
        <li
          className="grid min-w-[34px] flex-1 grid-rows-[auto_1fr_auto] justify-items-center gap-1"
          data-peak={isPeak || undefined}
          key={name}
        >
          <span aria-hidden="true" className="text-[11px] text-ink-soft tabular-nums">
            {bar.total > 0 ? formatAverage(bar.average) : ''}
          </span>
          <span aria-hidden="true" className="relative w-full">
            <span
              className="absolute inset-x-0 bottom-0 rounded-t-[4px] bg-wine"
              style={{ height: `${highest > 0 ? (bar.average / highest) * 100 : 0}%` }}
            />
          </span>
          <span aria-hidden="true" className="pb-1 text-[11px] text-ink-muted">
            {label}
          </span>
          <span className="sr-only">
            {`${name}: ${visits(bar.total)} en total, ${formatAverage(bar.average)} en promedio`}
          </span>
        </li>
      ))}
    </ol>
  );

  return (
    <Card className="grid gap-4 p-5 sm:p-6">
      <div className="grid gap-1">
        <h2 className="m-0 text-lg font-semibold">{title}</h2>
        <p className="m-0 text-sm text-ink-soft">{note}</p>
      </div>
      {scrollable ? (
        <ScrollRegion label={title}>{list}</ScrollRegion>
      ) : (
        list
      )}
    </Card>
  );
}
