import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { PasswordHasher } from '../auth/application/ports/security.ports.js';
import { PASSWORD_HASHER } from '../auth/auth.tokens.js';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { RestaurantRepository } from './application/ports/restaurant.repository.js';
import type { RestaurantProfileRepository } from './application/ports/restaurant-profile.repository.js';
import type { RestaurantQrRepository } from './application/ports/restaurant-qr.repository.js';
import type {
  RestaurantAssetStorage,
  RestaurantLogoStorage,
  RestaurantQrRenderer,
} from './application/ports/restaurant-services.js';
import { CreateRestaurant } from './application/use-cases/create-restaurant.js';
import { DeleteRestaurant } from './application/use-cases/delete-restaurant.js';
import { GetPublicRestaurant } from './application/use-cases/get-public-restaurant.js';
import { GenerateRestaurantQr } from './application/use-cases/generate-restaurant-qr.js';
import { GetRestaurantLogo } from './application/use-cases/get-restaurant-logo.js';
import { GetRestaurantProfile } from './application/use-cases/get-restaurant-profile.js';
import { ListRestaurants } from './application/use-cases/list-restaurants.js';
import { ListOwnedRestaurants } from './application/use-cases/list-owned-restaurants.js';
import { RetryAssetDeletions } from './application/use-cases/retry-asset-deletions.js';
import { SetRestaurantStatus } from './application/use-cases/set-restaurant-status.js';
import { UpdateRestaurantProfile } from './application/use-cases/update-restaurant-profile.js';
import { LocalRestaurantAssetStorage } from './infrastructure/local-restaurant-asset.storage.js';
import { NodeQrCodeRenderer } from './infrastructure/node-qr-code.renderer.js';
import { PendingAssetCleanupBootstrap } from './infrastructure/pending-asset-cleanup.bootstrap.js';
import { PrismaRestaurantRepository } from './infrastructure/prisma-restaurant.repository.js';
import {
  CREATE_RESTAURANT,
  DELETE_RESTAURANT,
  GENERATE_RESTAURANT_QR,
  GET_PUBLIC_RESTAURANT,
  GET_RESTAURANT_LOGO,
  GET_RESTAURANT_PROFILE,
  LIST_RESTAURANTS,
  LIST_OWNED_RESTAURANTS,
  RESTAURANT_ASSET_STORAGE,
  RESTAURANT_LOGO_STORAGE,
  RESTAURANT_PROFILE_REPOSITORY,
  RESTAURANT_QR_REPOSITORY,
  RESTAURANT_QR_RENDERER,
  RESTAURANT_REPOSITORY,
  RETRY_ASSET_DELETIONS,
  SET_RESTAURANT_STATUS,
  UPDATE_RESTAURANT_PROFILE,
} from './restaurant.tokens.js';
import { RestaurantsController } from './restaurants.controller.js';

@Module({
  controllers: [RestaurantsController],
  imports: [AuthModule],
  providers: [
    {
      inject: [PrismaService],
      provide: RESTAURANT_REPOSITORY,
      useFactory: (prisma: PrismaService): RestaurantRepository =>
        new PrismaRestaurantRepository(prisma),
    },
    {
      inject: [ConfigService],
      provide: RESTAURANT_ASSET_STORAGE,
      useFactory: (config: ConfigService): RestaurantAssetStorage =>
        new LocalRestaurantAssetStorage(
          config.getOrThrow<string>('STORAGE_PATH'),
        ),
    },
    {
      inject: [PrismaService],
      provide: RESTAURANT_PROFILE_REPOSITORY,
      useFactory: (prisma: PrismaService): RestaurantProfileRepository =>
        new PrismaRestaurantRepository(prisma),
    },
    {
      inject: [ConfigService],
      provide: RESTAURANT_LOGO_STORAGE,
      useFactory: (config: ConfigService): RestaurantLogoStorage =>
        new LocalRestaurantAssetStorage(
          config.getOrThrow<string>('STORAGE_PATH'),
        ),
    },
    {
      inject: [PrismaService],
      provide: RESTAURANT_QR_REPOSITORY,
      useFactory: (prisma: PrismaService): RestaurantQrRepository =>
        new PrismaRestaurantRepository(prisma),
    },
    {
      provide: RESTAURANT_QR_RENDERER,
      useFactory: (): RestaurantQrRenderer => new NodeQrCodeRenderer(),
    },
    {
      inject: [
        RESTAURANT_REPOSITORY,
        PASSWORD_HASHER,
        RESTAURANT_QR_RENDERER,
        ConfigService,
      ],
      provide: CREATE_RESTAURANT,
      useFactory: (
        repository: RestaurantRepository,
        passwordHasher: PasswordHasher,
        renderer: RestaurantQrRenderer,
        config: ConfigService,
      ): CreateRestaurant => new CreateRestaurant(
        repository,
        passwordHasher,
        renderer,
        config.getOrThrow<string>('PUBLIC_APP_URL'),
      ),
    },
    {
      inject: [RESTAURANT_REPOSITORY],
      provide: LIST_RESTAURANTS,
      useFactory: (repository: RestaurantRepository): ListRestaurants =>
        new ListRestaurants(repository),
    },
    {
      inject: [RESTAURANT_REPOSITORY],
      provide: SET_RESTAURANT_STATUS,
      useFactory: (repository: RestaurantRepository): SetRestaurantStatus =>
        new SetRestaurantStatus(repository),
    },
    {
      inject: [RESTAURANT_REPOSITORY, RESTAURANT_ASSET_STORAGE],
      provide: DELETE_RESTAURANT,
      useFactory: (
        repository: RestaurantRepository,
        storage: RestaurantAssetStorage,
      ): DeleteRestaurant => new DeleteRestaurant(repository, storage),
    },
    {
      inject: [RESTAURANT_REPOSITORY],
      provide: GET_PUBLIC_RESTAURANT,
      useFactory: (repository: RestaurantRepository): GetPublicRestaurant =>
        new GetPublicRestaurant(repository),
    },
    {
      inject: [RESTAURANT_PROFILE_REPOSITORY],
      provide: LIST_OWNED_RESTAURANTS,
      useFactory: (repository: RestaurantProfileRepository): ListOwnedRestaurants =>
        new ListOwnedRestaurants(repository),
    },
    {
      inject: [RESTAURANT_PROFILE_REPOSITORY],
      provide: GET_RESTAURANT_PROFILE,
      useFactory: (repository: RestaurantProfileRepository): GetRestaurantProfile =>
        new GetRestaurantProfile(repository),
    },
    {
      inject: [RESTAURANT_PROFILE_REPOSITORY, RESTAURANT_LOGO_STORAGE],
      provide: UPDATE_RESTAURANT_PROFILE,
      useFactory: (
        repository: RestaurantProfileRepository,
        storage: RestaurantLogoStorage,
      ): UpdateRestaurantProfile =>
        new UpdateRestaurantProfile(repository, storage),
    },
    {
      inject: [RESTAURANT_PROFILE_REPOSITORY, RESTAURANT_LOGO_STORAGE],
      provide: GET_RESTAURANT_LOGO,
      useFactory: (
        repository: RestaurantProfileRepository,
        storage: RestaurantLogoStorage,
      ): GetRestaurantLogo => new GetRestaurantLogo(repository, storage),
    },
    {
      inject: [
        RESTAURANT_QR_REPOSITORY,
        RESTAURANT_QR_RENDERER,
        ConfigService,
      ],
      provide: GENERATE_RESTAURANT_QR,
      useFactory: (
        repository: RestaurantQrRepository,
        renderer: RestaurantQrRenderer,
        config: ConfigService,
      ): GenerateRestaurantQr =>
        new GenerateRestaurantQr(
          repository,
          renderer,
          config.getOrThrow<string>('PUBLIC_APP_URL'),
        ),
    },
    {
      inject: [RESTAURANT_REPOSITORY, RESTAURANT_ASSET_STORAGE],
      provide: RETRY_ASSET_DELETIONS,
      useFactory: (
        repository: RestaurantRepository,
        storage: RestaurantAssetStorage,
      ): RetryAssetDeletions => new RetryAssetDeletions(repository, storage),
    },
    PendingAssetCleanupBootstrap,
  ],
})
export class RestaurantsModule {}
