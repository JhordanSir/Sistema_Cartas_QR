import {
  addPeruCalendarDays,
  nextPeruScheduledInstant,
  occurrencesOfPeruWeekday,
  toPeruDateTime,
} from './peru-time.js';

describe('Peru analytics time', () => {
  it('uses UTC-5 around the local midnight boundary', () => {
    expect(toPeruDateTime(new Date('2026-09-01T04:59:59.999Z'))).toEqual({
      date: '2026-08-31',
      hour: 23,
    });
    expect(toPeruDateTime(new Date('2026-09-01T05:00:00.000Z'))).toEqual({
      date: '2026-09-01',
      hour: 0,
    });
  });

  it('keeps calendar calculations independent from the server timezone', () => {
    expect(addPeruCalendarDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(occurrencesOfPeruWeekday('2026-08-31', '2026-09-06', 0)).toBe(1);
  });

  it('schedules retention at the next 04:15 in Peru', () => {
    expect(nextPeruScheduledInstant(new Date('2026-09-01T09:00:00.000Z'), 4, 15))
      .toEqual(new Date('2026-09-01T09:15:00.000Z'));
    expect(nextPeruScheduledInstant(new Date('2026-09-01T09:15:00.000Z'), 4, 15))
      .toEqual(new Date('2026-09-02T09:15:00.000Z'));
  });
});
