import type { IncomingMessage } from 'node:http';

import { Inject, Logger, type OnModuleDestroy } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import {
  ACCESS_TOKEN_COOKIE,
  REALTIME_CLOSE_CODES,
  REALTIME_PATH,
  type RealtimeErrorCode,
  type RealtimeServerMessage,
} from '@sirio/shared';
import type { WebSocket, WebSocketServer } from 'ws';

import { AuthApplicationService } from '../../auth/application/auth.service.js';
import { AUTH_APPLICATION } from '../../auth/auth.tokens.js';
import { AuthRole } from '../../auth/domain/auth-role.js';
import { AuthApplicationError } from '../../auth/domain/auth.errors.js';
import type { AuthPrincipal } from '../../auth/domain/auth.types.js';
import { Public } from '../../auth/presentation/auth.decorators.js';
import { digitizationTopic, SubscriptionHub } from '../application/subscription-hub.js';
import { REALTIME_OPTIONS, SUBSCRIPTION_HUB } from '../realtime.tokens.js';
import { isAllowedOrigin, parseDigitizationSubscription, readCookie } from './realtime-protocol.js';

export interface RealtimeOptions {
  allowedOrigins: readonly string[];
}

/** Detects dead peers and keeps an idle socket well inside nginx's 240 s read timeout. */
export const HEARTBEAT_INTERVAL_MS = 20_000;
/** A digitization lasts a few minutes at most; a socket never outlives its session for long. */
export const MAXIMUM_CONNECTION_AGE_MS = 5 * 60_000;
const MAXIMUM_SUBSCRIPTIONS_PER_CONNECTION = 4;

interface ConnectionState {
  alive: boolean;
  openedAt: number;
  principal: Promise<AuthPrincipal | null>;
}

/**
 * The global HTTP guards cannot read a socket, so the gateway is public to them and
 * authenticates the handshake itself: same-origin, the access cookie, and the OWNER role.
 */
@Public()
@WebSocketGateway({ maxPayload: 4 * 1024, path: REALTIME_PATH })
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly connections = new WeakMap<WebSocket, ConnectionState>();
  private heartbeat: NodeJS.Timeout | undefined;

  constructor(
    @Inject(AUTH_APPLICATION) private readonly auth: AuthApplicationService,
    @Inject(SUBSCRIPTION_HUB) private readonly hub: SubscriptionHub,
    @Inject(REALTIME_OPTIONS) private readonly options: RealtimeOptions,
  ) {}

  afterInit(server: WebSocketServer): void {
    this.heartbeat = setInterval(() => this.sweep(server.clients), HEARTBEAT_INTERVAL_MS);
    this.heartbeat.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.heartbeat);
  }

  async handleConnection(client: WebSocket, request: IncomingMessage): Promise<void> {
    if (!isAllowedOrigin(request.headers, this.options.allowedOrigins)) {
      client.close(REALTIME_CLOSE_CODES.forbiddenOrigin, 'Origin not allowed');
      return;
    }
    // Stored before awaiting so a message sent right after the handshake waits for it.
    const state: ConnectionState = {
      alive: true,
      openedAt: Date.now(),
      principal: this.authenticate(request),
    };
    this.connections.set(client, state);
    client.on('pong', () => {
      state.alive = true;
    });
    if (!(await state.principal)) {
      client.close(REALTIME_CLOSE_CODES.sessionExpired, 'Session expired');
    }
  }

  handleDisconnect(client: WebSocket): void {
    this.hub.unsubscribeAll(client);
  }

  @SubscribeMessage('subscribe')
  async subscribe(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() data: unknown,
  ): Promise<RealtimeServerMessage> {
    const principal = await this.connections.get(client)?.principal;
    if (!principal) return failure('SESSION_EXPIRED');

    const subscription = parseDigitizationSubscription(data);
    if (!subscription) return failure('INVALID_MESSAGE');
    if (this.hub.subscriptionCount(client) >= MAXIMUM_SUBSCRIPTIONS_PER_CONNECTION) {
      return failure('TOO_MANY_SUBSCRIPTIONS');
    }
    if (!(await this.auth.ownerCanAccessRestaurant(principal, subscription.restaurantId))) {
      return failure('ACCESS_DENIED');
    }

    this.hub.subscribe(digitizationTopic(subscription.restaurantId, subscription.progressId), client);
    return { data: { progressId: subscription.progressId }, event: 'subscribed' };
  }

  private async authenticate(request: IncomingMessage): Promise<AuthPrincipal | null> {
    const token = readCookie(request.headers.cookie, ACCESS_TOKEN_COOKIE);
    if (!token) return null;
    try {
      const principal = await this.auth.authenticateAccessToken(token);
      return principal.role === AuthRole.OWNER ? principal : null;
    } catch (error) {
      if (!(error instanceof AuthApplicationError)) {
        this.logger.error('WebSocket handshake could not be authenticated', error);
      }
      return null;
    }
  }

  /** Pings every socket, drops the ones that missed the previous ping and the expired ones. */
  private sweep(clients: Set<WebSocket>): void {
    const now = Date.now();
    for (const client of clients) {
      const state = this.connections.get(client);
      if (!state) continue;
      if (now - state.openedAt >= MAXIMUM_CONNECTION_AGE_MS) {
        client.close(REALTIME_CLOSE_CODES.connectionExpired, 'Connection expired');
      } else if (!state.alive) {
        client.terminate();
      } else {
        state.alive = false;
        client.ping();
      }
    }
  }
}

function failure(code: RealtimeErrorCode): RealtimeServerMessage {
  return { data: { code }, event: 'error' };
}
