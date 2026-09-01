import { peruDateToStorageDate, toPeruDateTime } from '../../domain/peru-time.js';
import type { RecordPublicViewResult, ViewStatisticsRepository } from '../ports/view-statistics.repository.js';
import { hashVisitorIp } from '../visitor-hash.js';

export interface RecordPublicViewInput {
  now?: Date;
  slug: string;
  visitorIp: string;
}

export class RecordPublicView {
  constructor(
    private readonly repository: ViewStatisticsRepository,
    private readonly hashSecret: string,
  ) {}

  execute(input: RecordPublicViewInput): Promise<RecordPublicViewResult> {
    const viewedAt = input.now ?? new Date();
    const peruTime = toPeruDateTime(viewedAt);
    return this.repository.recordUniquePublicView({
      slug: input.slug,
      viewDate: peruDateToStorageDate(peruTime.date),
      viewedAt,
      viewHour: peruTime.hour,
      visitorHash: hashVisitorIp(input.visitorIp, this.hashSecret),
    });
  }
}
