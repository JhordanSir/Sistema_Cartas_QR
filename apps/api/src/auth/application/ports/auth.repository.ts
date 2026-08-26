import type { AuthRole } from '../../domain/auth-role.js';
import type {
  AuthAccount,
  AuthPrincipal,
} from '../../domain/auth.types.js';

export interface CreateSessionInput {
  accountId: string;
  expiresAt: Date;
  id: string;
  refreshTokenDigest: string;
  role: AuthRole;
}

export interface RotateSessionInput {
  currentDigest: string;
  expiresAt: Date;
  id: string;
  newDigest: string;
  now: Date;
}

export interface AuthRepository {
  createSession(input: CreateSessionInput): Promise<void>;
  ensureAdmin(email: string, passwordHash: string): Promise<AuthAccount>;
  findAccountByEmail(email: string, role: AuthRole): Promise<AuthAccount | null>;
  findAccountById(accountId: string, role: AuthRole): Promise<AuthAccount | null>;
  findActivePrincipal(
    sessionId: string,
    accountId: string,
    role: AuthRole,
    now: Date,
  ): Promise<AuthPrincipal | null>;
  ownerHasRestaurant(ownerId: string, restaurantId: string): Promise<boolean>;
  replacePasswordAndRevokeSessions(
    accountId: string,
    role: AuthRole,
    passwordHash: string,
    revokedAt: Date,
  ): Promise<void>;
  revokeSession(sessionId: string, revokedAt: Date): Promise<void>;
  revokeSessionByDigest(
    sessionId: string,
    refreshTokenDigest: string,
    revokedAt: Date,
  ): Promise<boolean>;
  rotateSession(input: RotateSessionInput): Promise<boolean>;
}
