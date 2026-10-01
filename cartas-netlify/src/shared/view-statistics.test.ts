import { describe, expect, it } from 'vitest';

import { toLimaDateTime } from './lima-time';
import { calculateViewStatistics, formatAverage, formatHour, peakSentence, type ViewBucket } from './view-statistics';

// 2026-10-01 is a Thursday.
const TODAY = '2026-10-01';

function visit(date: string, hour: number, viewCount = 1): ViewBucket {
  return { date, hour, viewCount };
}

describe('calculateViewStatistics', () => {
  it('sin visitas, todo queda en cero y no hay pico', () => {
    const statistics = calculateViewStatistics([], TODAY);

    expect(statistics).toMatchObject({ allTime: 0, last30Days: 0, last7Days: 0, peak: null });
    expect(statistics.hours).toHaveLength(24);
    expect(statistics.weekdays).toHaveLength(7);
    expect(statistics.hours.every((bar) => bar.total === 0 && bar.average === 0)).toBe(true);
  });

  it('una visita a las 23:30 hora de Lima cuenta para ese día y esa hora', () => {
    const { date, hour } = toLimaDateTime(new Date('2026-10-02T04:30:00Z'));

    const statistics = calculateViewStatistics([visit(date, hour)], TODAY);

    expect(statistics.last7Days).toBe(1);
    expect(statistics.hours[23]).toEqual({ average: 1, total: 1 });
    expect(statistics.weekdays[4]).toEqual({ average: 1, total: 1 });
  });

  it('los totales de 7 y 30 días incluyen el día del borde y excluyen el anterior', () => {
    const statistics = calculateViewStatistics(
      [visit('2026-09-25', 10), visit('2026-09-24', 10), visit('2026-09-02', 10), visit('2026-09-01', 10)],
      TODAY,
    );

    expect(statistics).toMatchObject({ allTime: 4, last30Days: 3, last7Days: 1 });
  });

  it('los promedios por hora dividen entre los días desde la primera visita hasta hoy', () => {
    // From 2026-09-22 to today there are 10 days.
    const statistics = calculateViewStatistics([visit('2026-09-22', 20, 10), visit(TODAY, 20, 5), visit(TODAY, 9)], TODAY);

    expect(statistics.hours[20]).toEqual({ average: 1.5, total: 15 });
    expect(statistics.hours[9]).toEqual({ average: 0.1, total: 1 });
    expect(statistics.hours[0]).toEqual({ average: 0, total: 0 });
  });

  it('los promedios por día de la semana dividen entre las veces que cayó ese día', () => {
    // Thursdays 17, 24 and 1; Saturdays 19 and 26.
    const statistics = calculateViewStatistics(
      [
        visit('2026-09-17', 13, 2),
        visit('2026-09-19', 20, 3),
        visit('2026-09-24', 13, 2),
        visit('2026-09-26', 20, 2),
        visit(TODAY, 13, 2),
      ],
      TODAY,
    );

    expect(statistics.weekdays[4]).toEqual({ average: 2, total: 6 });
    expect(statistics.weekdays[6]).toEqual({ average: 2.5, total: 5 });
    expect(statistics.weekdays[0]).toEqual({ average: 0, total: 0 });
    // Saturday wins by average although Thursday has more visits in total.
    expect(statistics.peak).toEqual({ hour: 13, weekday: 6 });
  });

  it('suma los eventos y los resúmenes de la misma fecha y hora', () => {
    const statistics = calculateViewStatistics([visit('2026-08-01', 12, 4), visit('2026-08-01', 12, 3)], TODAY);

    expect(statistics.allTime).toBe(7);
    expect(statistics.last30Days).toBe(0);
    expect(statistics.hours[12]?.total).toBe(7);
  });

  it('redondea los promedios a un decimal', () => {
    const statistics = calculateViewStatistics([visit('2026-09-29', 8)], TODAY);

    expect(statistics.hours[8]?.average).toBe(0.3);
  });

  it('si dos horas empatan, el pico es la más temprana, y entre días, el primero desde el lunes', () => {
    // 2026-09-28 is a Monday and 2026-09-29 a Tuesday.
    const statistics = calculateViewStatistics([visit('2026-09-28', 18), visit('2026-09-29', 11)], TODAY);

    expect(statistics.peak).toEqual({ hour: 11, weekday: 1 });
  });
});

describe('textos de las estadísticas', () => {
  it('arma la frase del pico con el día en plural y la hora en punto', () => {
    expect(peakSentence({ hour: 20, weekday: 6 })).toBe('El mayor movimiento llega los sábados a las 20:00.');
    expect(peakSentence({ hour: 9, weekday: 1 })).toBe('El mayor movimiento llega los lunes a las 09:00.');
  });

  it('formatea horas y promedios', () => {
    expect(formatHour(0)).toBe('00:00');
    expect(formatHour(15)).toBe('15:00');
    expect(formatAverage(1.5)).toBe('1.5');
    expect(formatAverage(2)).toBe('2.0');
  });
});
