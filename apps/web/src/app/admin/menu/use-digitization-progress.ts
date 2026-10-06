'use client';

import {
  type DigitizationProgress,
  REALTIME_CLOSE_CODES,
  REALTIME_PATH,
  type RealtimeServerMessage,
} from '@sirio/shared';
import { useCallback, useEffect, useRef, useState } from 'react';

/** How long the page waits for the subscription before digitizing without live progress. */
const SUBSCRIPTION_TIMEOUT_MS = 3_000;

type Connection = 'session-expired' | 'subscribed' | 'unavailable';

export interface DigitizationProgressChannel {
  /** True while the API's stages are arriving over the socket. */
  live: boolean;
  progress: DigitizationProgress | null;
  /** Resolves the id to send with the request, or null to digitize without live progress. */
  start: (restaurantId: string) => Promise<string | null>;
  stop: () => void;
}

/**
 * Subscribes to the progress the API publishes over `/api/realtime` for one digitization.
 * The HTTP request still decides the outcome: if the socket fails, the page simply
 * digitizes without live stages.
 */
export function useDigitizationProgress(): DigitizationProgressChannel {
  const socketRef = useRef<WebSocket | null>(null);
  const [live, setLive] = useState(false);
  const [progress, setProgress] = useState<DigitizationProgress | null>(null);

  const stop = useCallback(() => {
    socketRef.current?.close(1000);
    socketRef.current = null;
    setLive(false);
  }, []);

  useEffect(() => stop, [stop]);

  const connect = useCallback(
    (restaurantId: string, progressId: string): Promise<Connection> =>
      new Promise((resolve) => {
        const socket = new WebSocket(realtimeUrl());
        socketRef.current = socket;
        const timer = window.setTimeout(() => {
          socket.close();
          settle('unavailable');
        }, SUBSCRIPTION_TIMEOUT_MS);
        let settled: Connection | null = null;
        function settle(connection: Connection): void {
          if (settled) return;
          settled = connection;
          window.clearTimeout(timer);
          resolve(connection);
        }

        socket.addEventListener('open', () => {
          socket.send(
            JSON.stringify({ data: { progressId, restaurantId, topic: 'digitization' }, event: 'subscribe' }),
          );
        });
        socket.addEventListener('message', (event) => {
          const message = parseMessage(event.data);
          if (message?.event === 'subscribed' && message.data.progressId === progressId) {
            settle('subscribed');
          } else if (message?.event === 'error') {
            socket.close();
            settle('unavailable');
          } else if (message?.event === 'digitization.progress' && message.data.progressId === progressId) {
            setProgress(message.data);
          }
        });
        socket.addEventListener('close', (event) => {
          if (socketRef.current === socket) socketRef.current = null;
          // A socket that never subscribed was never live, so there is nothing to undo.
          if (settled === 'subscribed') setLive(false);
          settle(event.code === REALTIME_CLOSE_CODES.sessionExpired ? 'session-expired' : 'unavailable');
        });
      }),
    [],
  );

  const start = useCallback(
    async (restaurantId: string): Promise<string | null> => {
      stop();
      setProgress(null);
      // randomUUID needs a secure context; plain HTTP on a LAN address digitizes without it.
      if (typeof WebSocket === 'undefined' || typeof crypto.randomUUID !== 'function') return null;
      const progressId = crypto.randomUUID();
      let connection = await connect(restaurantId, progressId);
      if (connection === 'session-expired') {
        // The access cookie lasts minutes; checking the session renews it from the refresh token.
        const renewed = await fetch('/api/session/status?role=OWNER', { method: 'POST' }).catch(() => null);
        if (renewed?.ok) connection = await connect(restaurantId, progressId);
      }
      if (connection !== 'subscribed') return null;
      setLive(true);
      return progressId;
    },
    [connect, stop],
  );

  return { live, progress, start, stop };
}

function realtimeUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${REALTIME_PATH}`;
}

function parseMessage(data: unknown): RealtimeServerMessage | null {
  try {
    const message = JSON.parse(String(data)) as unknown;
    return typeof message === 'object' && message !== null && 'event' in message && 'data' in message
      ? (message as RealtimeServerMessage)
      : null;
  } catch {
    return null;
  }
}
