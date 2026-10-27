import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';

import { RETAIN_VIEW_EVENTS } from '../view-statistics.tokens.js';
import { RetainViewEvents } from '../application/use-cases/retain-view-events.js';
import { nextPeruScheduledInstant } from '../domain/peru-time.js';

const RETENTION_RUN_HOUR = 4;
const RETENTION_RUN_MINUTE = 15;

@Injectable()
export class ViewRetentionScheduler
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(ViewRetentionScheduler.name);
  private timer: NodeJS.Timeout | undefined;

  constructor(
    @Inject(RETAIN_VIEW_EVENTS)
    private readonly retainViewEvents: RetainViewEvents,
  ) {}

  onApplicationBootstrap(): void {
    this.scheduleNextRun();
  }

  onApplicationShutdown(): void {
    if (this.timer) clearTimeout(this.timer);
  }

  private scheduleNextRun(now: Date = new Date()): void {
    const nextRun = nextPeruScheduledInstant(
      now,
      RETENTION_RUN_HOUR,
      RETENTION_RUN_MINUTE,
    );
    this.timer = setTimeout(() => {
      void this.runAndScheduleAgain();
    }, nextRun.getTime() - now.getTime());
    this.timer.unref();
  }

  private async runAndScheduleAgain(): Promise<void> {
    try {
      const consolidated = await this.retainViewEvents.execute();
      this.logger.log(`Consolidated ${consolidated} expired view events`);
    } catch (error) {
      this.logger.error('Unable to consolidate expired view events', error);
    } finally {
      this.scheduleNextRun();
    }
  }
}
