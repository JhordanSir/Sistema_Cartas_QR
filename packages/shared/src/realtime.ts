/**
 * Where the API's WebSocket gateway listens. The browser opens it on the web origin and
 * Next.js forwards the upgrade by rewrite, so the socket keeps the BFF's single entry point.
 */
export const REALTIME_PATH = "/api/realtime";

/** Name of the HttpOnly cookie the BFF stores the access token in; the handshake carries it. */
export const ACCESS_TOKEN_COOKIE = "sirio_access";

/** Close codes from the 4000–4999 range RFC 6455 leaves to applications. */
export const REALTIME_CLOSE_CODES = {
  connectionExpired: 4408,
  forbiddenOrigin: 4403,
  sessionExpired: 4401
} as const;

export type RealtimeErrorCode =
  | "ACCESS_DENIED"
  | "INVALID_MESSAGE"
  | "SESSION_EXPIRED"
  | "TOO_MANY_SUBSCRIPTIONS";

/** Asks for the progress of one digitization, identified by an id the browser generates. */
export interface DigitizationSubscription {
  progressId: string;
  restaurantId: string;
  topic: "digitization";
}

export type RealtimeServerMessage =
  | { data: { progressId: string }; event: "subscribed" }
  | { data: { code: RealtimeErrorCode }; event: "error" };
