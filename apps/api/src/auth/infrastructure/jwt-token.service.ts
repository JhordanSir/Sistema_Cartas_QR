import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';

import type { TokenService } from '../application/ports/security.ports.js';
import { AuthApplicationError } from '../domain/auth.errors.js';
import { AuthRole } from '../domain/auth-role.js';
import type {
  IssuedTokenPair,
  TokenSubject,
} from '../domain/auth.types.js';

type TokenKind = 'access' | 'refresh';

interface JwtPayload {
  role?: unknown;
  sid?: unknown;
  sub?: unknown;
  typ?: unknown;
}

export class JwtTokenService implements TokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresIn: number;
  private readonly refreshExpiresIn: number;
  private readonly audience: string;
  private readonly issuer: string;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.accessSecret = config.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.refreshSecret = config.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.accessExpiresIn = config.getOrThrow<number>(
      'JWT_ACCESS_TTL_SECONDS',
    );
    this.refreshExpiresIn = config.getOrThrow<number>(
      'JWT_REFRESH_TTL_SECONDS',
    );
    this.audience = config.getOrThrow<string>('JWT_AUDIENCE');
    this.issuer = config.getOrThrow<string>('JWT_ISSUER');
  }

  async issueTokenPair(subject: TokenSubject): Promise<IssuedTokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.sign(subject, 'access', this.accessSecret, this.accessExpiresIn),
      this.sign(subject, 'refresh', this.refreshSecret, this.refreshExpiresIn),
    ]);

    return {
      accessExpiresIn: this.accessExpiresIn,
      accessToken,
      refreshExpiresIn: this.refreshExpiresIn,
      refreshToken,
    };
  }

  verifyAccessToken(token: string): Promise<TokenSubject> {
    return this.verify(token, 'access', this.accessSecret);
  }

  verifyRefreshToken(token: string): Promise<TokenSubject> {
    return this.verify(token, 'refresh', this.refreshSecret);
  }

  private sign(
    subject: TokenSubject,
    kind: TokenKind,
    secret: string,
    expiresIn: number,
  ): Promise<string> {
    return this.jwt.signAsync(
      {
        role: subject.role,
        sid: subject.sessionId,
        typ: kind,
      },
      {
        algorithm: 'HS256',
        audience: this.audience,
        expiresIn,
        issuer: this.issuer,
        jwtid: randomUUID(),
        secret,
        subject: subject.accountId,
      },
    );
  }

  private async verify(
    token: string,
    expectedKind: TokenKind,
    secret: string,
  ): Promise<TokenSubject> {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        algorithms: ['HS256'],
        audience: this.audience,
        issuer: this.issuer,
        secret,
      });

      if (
        payload.typ !== expectedKind ||
        typeof payload.sub !== 'string' ||
        typeof payload.sid !== 'string' ||
        !Object.values(AuthRole).includes(payload.role as AuthRole)
      ) {
        throw new Error('Unexpected JWT claims');
      }

      return {
        accountId: payload.sub,
        role: payload.role as AuthRole,
        sessionId: payload.sid,
      };
    } catch {
      throw new AuthApplicationError('INVALID_TOKEN', 'Invalid token');
    }
  }
}
