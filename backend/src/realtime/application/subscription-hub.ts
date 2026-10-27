import type { RealtimeServerMessage } from '@sirio/shared';

/** Anything that accepts a serialized message: a WebSocket in production, a fake in tests. */
export interface RealtimeSubscriber {
  send(message: string): void;
}

export function digitizationTopic(restaurantId: string, progressId: string): string {
  return `digitization:${restaurantId}:${progressId}`;
}

/**
 * In-memory registry of who listens to which topic. It lives in a single API process,
 * which is how Compose runs it; several replicas would need a shared broker instead.
 */
export class SubscriptionHub {
  private readonly subscribersByTopic = new Map<string, Set<RealtimeSubscriber>>();
  private readonly topicsBySubscriber = new Map<RealtimeSubscriber, Set<string>>();

  subscribe(topic: string, subscriber: RealtimeSubscriber): void {
    const subscribers = this.subscribersByTopic.get(topic) ?? new Set<RealtimeSubscriber>();
    subscribers.add(subscriber);
    this.subscribersByTopic.set(topic, subscribers);

    const topics = this.topicsBySubscriber.get(subscriber) ?? new Set<string>();
    topics.add(topic);
    this.topicsBySubscriber.set(subscriber, topics);
  }

  subscriptionCount(subscriber: RealtimeSubscriber): number {
    return this.topicsBySubscriber.get(subscriber)?.size ?? 0;
  }

  unsubscribeAll(subscriber: RealtimeSubscriber): void {
    for (const topic of this.topicsBySubscriber.get(subscriber) ?? []) {
      const subscribers = this.subscribersByTopic.get(topic);
      subscribers?.delete(subscriber);
      if (subscribers?.size === 0) this.subscribersByTopic.delete(topic);
    }
    this.topicsBySubscriber.delete(subscriber);
  }

  /** Returns how many subscribers received the message. */
  publish(topic: string, message: RealtimeServerMessage): number {
    const subscribers = this.subscribersByTopic.get(topic);
    if (!subscribers) return 0;
    const serialized = JSON.stringify(message);
    for (const subscriber of subscribers) subscriber.send(serialized);
    return subscribers.size;
  }
}
