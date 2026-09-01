import { addPeruCalendarDays, peruDateToStorageDate, toPeruDateTime } from '../../domain/peru-time.js';
import type { ViewStatisticsRepository } from '../ports/view-statistics.repository.js';

const DETAILED_VIEW_RETENTION_DAYS = 30;

export class RetainViewEvents {
  constructor(private readonly repository: ViewStatisticsRepository) {}

  execute(now: Date = new Date()): Promise<number> {
    const today = toPeruDateTime(now).date;
    const firstDetailedDate = addPeruCalendarDays(
      today,
      -(DETAILED_VIEW_RETENTION_DAYS - 1),
    );
    return this.repository.consolidateEventsBefore(
      peruDateToStorageDate(firstDetailedDate),
    );
  }
}
