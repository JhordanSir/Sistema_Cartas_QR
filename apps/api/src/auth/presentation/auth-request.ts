import type { AuthPrincipal } from '../domain/auth.types.js';

export interface AuthenticatedRequest {
  auth?: AuthPrincipal;
  headers: {
    authorization?: string | string[];
  };
  params: Record<string, string | undefined>;
}
