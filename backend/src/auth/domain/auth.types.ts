import type { AuthRole } from './auth-role.js';

export interface AuthAccount {
  email: string;
  id: string;
  isActive: boolean;
  passwordHash: string;
  role: AuthRole;
}

export interface AuthPrincipal {
  accountId: string;
  email: string;
  role: AuthRole;
  sessionId: string;
}

export interface TokenSubject {
  accountId: string;
  role: AuthRole;
  sessionId: string;
}

export interface IssuedTokenPair {
  accessExpiresIn: number;
  accessToken: string;
  refreshExpiresIn: number;
  refreshToken: string;
}

export interface AuthTokenResponse extends IssuedTokenPair {
  principal: Pick<AuthPrincipal, 'accountId' | 'email' | 'role'>;
  tokenType: 'Bearer';
}
