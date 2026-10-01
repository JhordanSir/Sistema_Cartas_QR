import { addDays, countWeekday, daysBetween, weekdayOf } from './lima-time';

// Unique visits to the public menu (§E11): one per restaurant, Lima date and
// visitor. The buckets come from view_events grouped by date and hour, plus
// the consolidated view_summaries.

export type ViewBucket = { date: string; hour: number; viewCount: number };

export type RhythmBar = {
  /** Total ÷ days in the range (hours) or times that weekday fell in it, to 1 decimal. */
  average: number;
  total: number;
};

export type ViewStatistics = {
  allTime: number;
  last30Days: number;
  last7Days: number;
  /** 24 entries: hour 0 to 23, Lima time. */
  hours: RhythmBar[];
  /** 7 entries: 0 = Sunday … 6 = Saturday. */
  weekdays: RhythmBar[];
  /** The busiest weekday and hour, or null without visits. */
  peak: { hour: number; weekday: number } | null;
};

/** Monday first, as the chart and the sentence read them. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
export const WEEKDAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] as const;
export const WEEKDAY_SHORT_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;
const WEEKDAY_PLURALS = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'] as const;

export const EMPTY_STATISTICS_MESSAGE = 'Aún no hay visitas. Comparte tu QR para empezar a medir.';

export function calculateViewStatistics(buckets: readonly ViewBucket[], today: string): ViewStatistics {
  const last7Start = addDays(today, -6);
  const last30Start = addDays(today, -29);
  const hourTotals = new Array<number>(24).fill(0);
  const weekdayTotals = new Array<number>(7).fill(0);
  let firstDate: string | null = null;
  let allTime = 0;
  let last7Days = 0;
  let last30Days = 0;

  for (const { date, hour, viewCount } of buckets) {
    if (!Number.isInteger(hour) || hour < 0 || hour > 23 || viewCount <= 0) continue;
    allTime += viewCount;
    if (date >= last7Start) last7Days += viewCount;
    if (date >= last30Start) last30Days += viewCount;
    hourTotals[hour] = (hourTotals[hour] ?? 0) + viewCount;
    const weekday = weekdayOf(date);
    weekdayTotals[weekday] = (weekdayTotals[weekday] ?? 0) + viewCount;
    if (firstDate === null || date < firstDate) firstDate = date;
  }

  const spanDays = firstDate ? daysBetween(firstDate, today) : 0;
  const weekdayDays = weekdayTotals.map((_, weekday) => (firstDate ? countWeekday(firstDate, today, weekday) : 0));

  return {
    allTime,
    hours: hourTotals.map((total) => ({ average: roundedAverage(total, spanDays), total })),
    last30Days,
    last7Days,
    peak: allTime === 0 ? null : { hour: busiestHour(hourTotals), weekday: busiestWeekday(weekdayTotals, weekdayDays) },
    weekdays: weekdayTotals.map((total, weekday) => ({
      average: roundedAverage(total, weekdayDays[weekday] ?? 0),
      total,
    })),
  };
}

function roundedAverage(total: number, days: number): number {
  return days > 0 ? Math.round((total / days) * 10) / 10 : 0;
}

/** Every hour spans the same days, so the busiest is the one with most visits; ties go to the earliest. */
function busiestHour(totals: readonly number[]): number {
  let best = 0;
  totals.forEach((total, hour) => {
    if (total > (totals[best] ?? 0)) best = hour;
  });
  return best;
}

/** By exact average, since a weekday can fall more times than another; ties go to the first from Monday. */
function busiestWeekday(totals: readonly number[], days: readonly number[]): number {
  const averageOf = (weekday: number): number => {
    const count = days[weekday] ?? 0;
    return count > 0 ? (totals[weekday] ?? 0) / count : 0;
  };
  let best: number = WEEK_ORDER[0];
  for (const weekday of WEEK_ORDER) {
    if (averageOf(weekday) > averageOf(best)) best = weekday;
  }
  return best;
}

/** «15:00» */
export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

/** «El mayor movimiento llega los {día} a las {HH:00}.» (§E11) */
export function peakSentence(peak: NonNullable<ViewStatistics['peak']>): string {
  return `El mayor movimiento llega los ${WEEKDAY_PLURALS[peak.weekday] ?? ''} a las ${formatHour(peak.hour)}.`;
}

const averageFormat = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1, minimumFractionDigits: 1 });

/** An average as the panel shows it: «1.5». */
export function formatAverage(value: number): string {
  return averageFormat.format(value);
}
