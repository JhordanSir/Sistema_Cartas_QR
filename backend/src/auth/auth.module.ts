import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';

import { PrismaService } from '../prisma/prisma.service.js';
import { AuthController } from './auth.controller.js';
import { AuthApplicationService } from './application/auth.service.js';
import { InitialAdminBootstrap } from './application/initial-admin.bootstrap.js';
import type { AuthRepository } from './application/ports/auth.repository.js';
import type {
  Clock,
  IdentifierGenerator,
  PasswordHasher,
  SecretDigester,
  TokenService,
} from './application/ports/security.ports.js';
import {
  AUTH_APPLICATION,
  AUTH_REPOSITORY,
  CLOCK,
  IDENTIFIER_GENERATOR,
  PASSWORD_HASHER,
  SECRET_DIGESTER,
  TOKEN_SERVICE,
} from './auth.tokens.js';
import { Argon2PasswordHasher } from './infrastructure/argon2-password.hasher.js';
import {
  CryptoIdentifierGenerator,
  Sha256SecretDigester,
  SystemClock,
} from './infrastructure/crypto.adapters.js';
import { JwtTokenService } from './infrastructure/jwt-token.service.js';
import { PrismaAuthRepository } from './infrastructure/prisma-auth.repository.js';
import { AccessTokenGuard } from './presentation/access-token.guard.js';
import { OwnerRestaurantGuard } from './presentation/owner-restaurant.guard.js';
import { RolesGuard } from './presentation/roles.guard.js';

@Module({
  controllers: [AuthController],
  exports: [AUTH_APPLICATION, OwnerRestaurantGuard, PASSWORD_HASHER],
  imports: [JwtModule.register({})],
  providers: [
    {
      inject: [PrismaService],
      provide: AUTH_REPOSITORY,
      useFactory: (prisma: PrismaService): AuthRepository =>
        new PrismaAuthRepository(prisma),
    },
    {
      provide: PASSWORD_HASHER,
      useFactory: (): PasswordHasher => new Argon2PasswordHasher(),
    },
    {
      provide: SECRET_DIGESTER,
      useFactory: (): SecretDigester => new Sha256SecretDigester(),
    },
    {
      provide: IDENTIFIER_GENERATOR,
      useFactory: (): IdentifierGenerator => new CryptoIdentifierGenerator(),
    },
    {
      provide: CLOCK,
      useFactory: (): Clock => new SystemClock(),
    },
    {
      inject: [JwtService, ConfigService],
      provide: TOKEN_SERVICE,
      useFactory: (jwt: JwtService, config: ConfigService): TokenService =>
        new JwtTokenService(jwt, config),
    },
    {
      inject: [
        AUTH_REPOSITORY,
        PASSWORD_HASHER,
        TOKEN_SERVICE,
        SECRET_DIGESTER,
        IDENTIFIER_GENERATOR,
        CLOCK,
      ],
      provide: AUTH_APPLICATION,
      useFactory: (
        repository: AuthRepository,
        passwordHasher: PasswordHasher,
        tokenService: TokenService,
        secretDigester: SecretDigester,
        identifiers: IdentifierGenerator,
        clock: Clock,
      ): AuthApplicationService =>
        new AuthApplicationService(
          repository,
          passwordHasher,
          tokenService,
          secretDigester,
          identifiers,
          clock,
        ),
    },
    {
      inject: [AUTH_REPOSITORY, PASSWORD_HASHER],
      provide: InitialAdminBootstrap,
      useFactory: (
        repository: AuthRepository,
        passwordHasher: PasswordHasher,
      ): InitialAdminBootstrap =>
        new InitialAdminBootstrap(repository, passwordHasher),
    },
    OwnerRestaurantGuard,
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AuthModule {}
