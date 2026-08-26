import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { AuthRole } from '../domain/auth-role.js';
import { JwtTokenService } from './jwt-token.service.js';

const SUBJECT = {
  accountId: '11111111-1111-4111-8111-111111111111',
  role: AuthRole.OWNER,
  sessionId: '33333333-3333-4333-8333-333333333333',
};

describe('JwtTokenService', () => {
  const jwt = new JwtService();
  const config = new ConfigService({
    JWT_ACCESS_SECRET: 'access-secret-with-at-least-32-characters',
    JWT_ACCESS_TTL_SECONDS: 900,
    JWT_AUDIENCE: 'sirio-cartas-qr-api',
    JWT_ISSUER: 'sirio-cartas-qr',
    JWT_REFRESH_SECRET: 'refresh-secret-with-at-least-32-characters',
    JWT_REFRESH_TTL_SECONDS: 604_800,
  });
  const service = new JwtTokenService(jwt, config);

  it('issues independently signed access and refresh tokens', async () => {
    const pair = await service.issueTokenPair(SUBJECT);

    expect(pair.accessToken).not.toBe(pair.refreshToken);
    expect(pair.accessExpiresIn).toBe(900);
    expect(pair.refreshExpiresIn).toBe(604_800);
    await expect(service.verifyAccessToken(pair.accessToken)).resolves.toEqual(
      SUBJECT,
    );
    await expect(
      service.verifyRefreshToken(pair.refreshToken),
    ).resolves.toEqual(SUBJECT);
  });

  it('prevents token-type confusion', async () => {
    const pair = await service.issueTokenPair(SUBJECT);

    await expect(
      service.verifyRefreshToken(pair.accessToken),
    ).rejects.toMatchObject({ code: 'INVALID_TOKEN' });
    await expect(
      service.verifyAccessToken(pair.refreshToken),
    ).rejects.toMatchObject({ code: 'INVALID_TOKEN' });
  });

  it('rejects a token from a different issuer or secret', async () => {
    const foreignToken = await jwt.signAsync(
      { role: AuthRole.OWNER, sid: SUBJECT.sessionId, typ: 'access' },
      {
        algorithm: 'HS256',
        audience: 'sirio-cartas-qr-api',
        issuer: 'foreign-issuer',
        secret: 'foreign-secret-with-at-least-32-characters',
        subject: SUBJECT.accountId,
      },
    );

    await expect(service.verifyAccessToken(foreignToken)).rejects.toMatchObject({
      code: 'INVALID_TOKEN',
    });
  });
});
