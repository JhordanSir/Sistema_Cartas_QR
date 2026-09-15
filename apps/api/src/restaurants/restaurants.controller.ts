import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UPLOAD_LIMITS } from '@sirio/shared';

import { AuthRole } from '../auth/domain/auth-role.js';
import type { AuthPrincipal } from '../auth/domain/auth.types.js';
import { OwnerRestaurantGuard } from '../auth/presentation/owner-restaurant.guard.js';
import {
  CurrentPrincipal,
  Public,
  Roles,
} from '../auth/presentation/auth.decorators.js';
import { CreateRestaurant } from './application/use-cases/create-restaurant.js';
import {
  DeleteRestaurant,
  type DeleteRestaurantResult,
} from './application/use-cases/delete-restaurant.js';
import { GetPublicRestaurant } from './application/use-cases/get-public-restaurant.js';
import { GetPublicRestaurantLogo } from './application/use-cases/get-public-restaurant-logo.js';
import { GenerateRestaurantQr } from './application/use-cases/generate-restaurant-qr.js';
import { GetRestaurantLogo } from './application/use-cases/get-restaurant-logo.js';
import { GetRestaurantProfile } from './application/use-cases/get-restaurant-profile.js';
import { ListRestaurants } from './application/use-cases/list-restaurants.js';
import { ListOwnedRestaurants } from './application/use-cases/list-owned-restaurants.js';
import { SetRestaurantStatus } from './application/use-cases/set-restaurant-status.js';
import { UpdateRestaurantProfile } from './application/use-cases/update-restaurant-profile.js';
import { restaurantQrDownloadDisposition } from './domain/restaurant-qr.js';
import type {
  PaginatedRestaurants,
  PublicRestaurant,
  RestaurantQrIdentity,
  RestaurantSummary,
  RestaurantProfile,
} from './domain/restaurant.types.js';
import {
  CREATE_RESTAURANT,
  DELETE_RESTAURANT,
  GENERATE_RESTAURANT_QR,
  GET_PUBLIC_RESTAURANT,
  GET_PUBLIC_RESTAURANT_LOGO,
  GET_RESTAURANT_LOGO,
  GET_RESTAURANT_PROFILE,
  LIST_RESTAURANTS,
  LIST_OWNED_RESTAURANTS,
  SET_RESTAURANT_STATUS,
  UPDATE_RESTAURANT_PROFILE,
} from './restaurant.tokens.js';
import {
  CreateRestaurantDto,
  DeleteRestaurantDto,
  ListRestaurantsDto,
  RestaurantQrFormatDto,
  SetRestaurantStatusDto,
  UpdateRestaurantProfileDto,
} from './presentation/restaurant.dto.js';
import { throwRestaurantHttpError } from './presentation/restaurant-http.errors.js';

@Controller()
export class RestaurantsController {
  constructor(
    @Inject(CREATE_RESTAURANT)
    private readonly createRestaurant: CreateRestaurant,
    @Inject(LIST_RESTAURANTS)
    private readonly listRestaurants: ListRestaurants,
    @Inject(SET_RESTAURANT_STATUS)
    private readonly setRestaurantStatus: SetRestaurantStatus,
    @Inject(DELETE_RESTAURANT)
    private readonly deleteRestaurant: DeleteRestaurant,
    @Inject(GET_PUBLIC_RESTAURANT)
    private readonly getPublicRestaurant: GetPublicRestaurant,
    @Inject(GET_PUBLIC_RESTAURANT_LOGO)
    private readonly getPublicRestaurantLogo: GetPublicRestaurantLogo,
    @Inject(LIST_OWNED_RESTAURANTS)
    private readonly listOwnedRestaurants: ListOwnedRestaurants,
    @Inject(GET_RESTAURANT_PROFILE)
    private readonly getRestaurantProfile: GetRestaurantProfile,
    @Inject(UPDATE_RESTAURANT_PROFILE)
    private readonly updateRestaurantProfile: UpdateRestaurantProfile,
    @Inject(GET_RESTAURANT_LOGO)
    private readonly getRestaurantLogo: GetRestaurantLogo,
    @Inject(GENERATE_RESTAURANT_QR)
    private readonly generateRestaurantQr: GenerateRestaurantQr,
  ) {}

  @Roles(AuthRole.OWNER)
  @Get('owner/restaurants')
  async ownedRestaurants(
    @CurrentPrincipal() principal: AuthPrincipal,
  ): Promise<RestaurantProfile[]> {
    try {
      return await this.listOwnedRestaurants.execute(principal);
    } catch (error) {
      throwRestaurantHttpError(error);
    }
  }

  @Roles(AuthRole.OWNER)
  @UseGuards(OwnerRestaurantGuard)
  @Get('owner/restaurants/:restaurantId/profile')
  async profile(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('restaurantId', new ParseUUIDPipe({ version: '4' })) restaurantId: string,
  ): Promise<RestaurantProfile> {
    try {
      return await this.getRestaurantProfile.execute({ principal, restaurantId });
    } catch (error) {
      throwRestaurantHttpError(error);
    }
  }

  @Roles(AuthRole.OWNER)
  @UseGuards(OwnerRestaurantGuard)
  @UseInterceptors(FileInterceptor('logo', { limits: { fileSize: UPLOAD_LIMITS.logo.maximumBytes, files: 1 } }))
  @Patch('owner/restaurants/:restaurantId/profile')
  async updateProfile(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('restaurantId', new ParseUUIDPipe({ version: '4' })) restaurantId: string,
    @Body() input: UpdateRestaurantProfileDto,
    @UploadedFile() logo?: { buffer: Buffer; mimetype: string },
  ): Promise<RestaurantProfile> {
    try {
      return await this.updateRestaurantProfile.execute({
        ...input,
        ...(logo
          ? { logo: { bytes: logo.buffer, contentType: logo.mimetype } }
          : {}),
        principal,
        restaurantId,
      });
    } catch (error) {
      throwRestaurantHttpError(error);
    }
  }

  @Roles(AuthRole.OWNER)
  @UseGuards(OwnerRestaurantGuard)
  @Get('owner/restaurants/:restaurantId/logo')
  async logo(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('restaurantId', new ParseUUIDPipe({ version: '4' })) restaurantId: string,
  ): Promise<StreamableFile> {
    try {
      const logo = await this.getRestaurantLogo.execute({ principal, restaurantId });
      if (!logo) throw new NotFoundException('Restaurant logo not found');
      return new StreamableFile(Buffer.from(logo.bytes), {
        disposition: 'inline',
        type: logo.contentType,
      });
    } catch (error) {
      throwRestaurantHttpError(error);
    }
  }

  @Roles(AuthRole.OWNER)
  @UseGuards(OwnerRestaurantGuard)
  @Get('owner/restaurants/:restaurantId/qr')
  async qrIdentity(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('restaurantId', new ParseUUIDPipe({ version: '4' })) restaurantId: string,
  ): Promise<RestaurantQrIdentity> {
    try {
      return await this.generateRestaurantQr.getIdentity({ principal, restaurantId });
    } catch (error) {
      throwRestaurantHttpError(error);
    }
  }

  @Roles(AuthRole.OWNER)
  @UseGuards(OwnerRestaurantGuard)
  @Get('owner/restaurants/:restaurantId/qr/:format')
  async qr(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('restaurantId', new ParseUUIDPipe({ version: '4' })) restaurantId: string,
    @Param('format', new ParseEnumPipe(RestaurantQrFormatDto))
    format: RestaurantQrFormatDto,
    @Query('download') download?: string,
  ): Promise<StreamableFile> {
    try {
      const document = await this.generateRestaurantQr.execute({
        format,
        principal,
        restaurantId,
      });
      return new StreamableFile(Buffer.from(document.bytes), {
        disposition: download === 'true'
          ? restaurantQrDownloadDisposition(document.fileName)
          : 'inline',
        type: document.contentType,
      });
    } catch (error) {
      throwRestaurantHttpError(error);
    }
  }

  @Roles(AuthRole.ADMIN)
  @Get('backoffice/restaurants')
  async list(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Query() query: ListRestaurantsDto,
  ): Promise<PaginatedRestaurants> {
    try {
      return await this.listRestaurants.execute({ ...query, principal });
    } catch (error) {
      throwRestaurantHttpError(error);
    }
  }

  @Roles(AuthRole.ADMIN)
  @Post('backoffice/restaurants')
  async create(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body() input: CreateRestaurantDto,
  ): Promise<RestaurantSummary> {
    try {
      return await this.createRestaurant.execute({ ...input, principal });
    } catch (error) {
      throwRestaurantHttpError(error);
    }
  }

  @Roles(AuthRole.ADMIN)
  @Patch('backoffice/restaurants/:id/status')
  async setStatus(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() input: SetRestaurantStatusDto,
  ): Promise<RestaurantSummary> {
    try {
      return await this.setRestaurantStatus.execute({
        id,
        principal,
        status: input.status,
      });
    } catch (error) {
      throwRestaurantHttpError(error);
    }
  }

  @Roles(AuthRole.ADMIN)
  @Delete('backoffice/restaurants/:id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() input: DeleteRestaurantDto,
  ): Promise<DeleteRestaurantResult> {
    try {
      return await this.deleteRestaurant.execute({ id, principal, ...input });
    } catch (error) {
      throwRestaurantHttpError(error);
    }
  }

  @Public()
  @Get('restaurants/public/:slug')
  async publicBySlug(@Param('slug') slug: string): Promise<PublicRestaurant> {
    const restaurant = await this.getPublicRestaurant.execute(slug);
    if (!restaurant) {
      throw new NotFoundException('Restaurant menu is unavailable');
    }
    return restaurant;
  }

  @Public()
  @Get('restaurants/public/:slug/logo')
  async publicLogo(@Param('slug') slug: string): Promise<StreamableFile> {
    const logo = await this.getPublicRestaurantLogo.execute(slug);
    if (!logo) {
      throw new NotFoundException('Restaurant logo is unavailable');
    }
    return new StreamableFile(Buffer.from(logo.bytes), {
      disposition: 'inline',
      type: logo.contentType,
    });
  }
}
