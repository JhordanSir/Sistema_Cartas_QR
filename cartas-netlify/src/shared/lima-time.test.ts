import { describe, expect, it } from 'vitest';

import { addDays, countWeekday, daysBetween, toLimaDateTime, weekdayOf } from './lima-time';

describe('hora de Lima', () => {
  it('una visita a las 23:30 hora de Lima cuenta para ese día, aunque en UTC ya sea el siguiente', () => {
    expect(toLimaDateTime(new Date('2026-10-02T04:30:00Z'))).toEqual({ date: '2026-10-01', hour: 23 });
  });

  it('la medianoche de Lima (05:00 UTC) abre el día siguiente', () => {
    expect(toLimaDateTime(new Date('2026-10-02T04:59:59.999Z'))).toEqual({ date: '2026-10-01', hour: 23 });
    expect(toLimaDateTime(new Date('2026-10-02T05:00:00Z'))).toEqual({ date: '2026-10-02', hour: 0 });
  });

  it('suma y resta días cruzando meses, años y bisiestos', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-10-01', -29)).toBe('2026-09-02');
  });

  it('da el día de la semana con 0 = domingo', () => {
    expect(weekdayOf('2026-10-01')).toBe(4);
    expect(weekdayOf('2026-10-04')).toBe(0);
  });

  it('cuenta los días de un rango con ambos extremos', () => {
    expect(daysBetween('2026-09-25', '2026-10-01')).toBe(7);
    expect(daysBetween('2026-10-01', '2026-10-01')).toBe(1);
    expect(daysBetween('2026-10-02', '2026-10-01')).toBe(0);
  });

  it('cuenta cuántas veces cae un día de la semana en un rango', () => {
    // September 2026 starts on a Tuesday.
    expect(countWeekday('2026-09-01', '2026-09-30', 2)).toBe(5);
    expect(countWeekday('2026-09-01', '2026-09-30', 1)).toBe(4);
    expect(countWeekday('2026-09-01', '2026-09-01', 2)).toBe(1);
    expect(countWeekday('2026-09-01', '2026-09-01', 3)).toBe(0);
  });
});
