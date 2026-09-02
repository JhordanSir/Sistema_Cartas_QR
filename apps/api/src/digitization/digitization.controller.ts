import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';

import { AuthRole } from '../auth/domain/auth-role.js';
import type { AuthPrincipal } from '../auth/domain/auth.types.js';
import { OwnerRestaurantGuard } from '../auth/presentation/owner-restaurant.guard.js';
import { CurrentPrincipal, Roles } from '../auth/presentation/auth.decorators.js';
import { DigitizeMenu } from './application/use-cases/digitize-menu.js';
import { GetOwnedMenu } from './application/use-cases/get-owned-menu.js';
import { PublishMenu, SetMenuTemplate } from './application/use-cases/publish-menu.js';
import { MENU_PHOTO_LIMITS, type PublishedMenu } from './domain/menu.types.js';
import {
  DIGITIZE_MENU,
  GET_OWNED_MENU,
  PUBLISH_MENU,
  SET_MENU_TEMPLATE,
} from './digitization.tokens.js';
import { throwDigitizationHttpError } from './presentation/digitization-http.errors.js';

interface UploadedMenuPhoto {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

@Controller('owner/restaurants/:restaurantId/menu')
@Roles(AuthRole.OWNER)
@UseGuards(OwnerRestaurantGuard)
export class DigitizationController {
  constructor(
    @Inject(DIGITIZE_MENU) private readonly digitizeMenu: DigitizeMenu,
    @Inject(GET_OWNED_MENU) private readonly getOwnedMenu: GetOwnedMenu,
    @Inject(PUBLISH_MENU) private readonly publishMenu: PublishMenu,
    @Inject(SET_MENU_TEMPLATE) private readonly setMenuTemplate: SetMenuTemplate,
  ) {}

  @Get()
  async getMenu(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('restaurantId', new ParseUUIDPipe({ version: '4' })) restaurantId: string,
  ): Promise<PublishedMenu> {
    try {
      return await this.getOwnedMenu.execute({ principal, restaurantId });
    } catch (error) {
      throwDigitizationHttpError(error);
    }
  }

  @Post('digitize')
  @UseInterceptors(
    FilesInterceptor('photos', MENU_PHOTO_LIMITS.maximumPhotoCount, {
      limits: {
        fileSize: MENU_PHOTO_LIMITS.maximumBytesPerPhoto,
        files: MENU_PHOTO_LIMITS.maximumPhotoCount,
      },
    }),
  )
  async digitize(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('restaurantId', new ParseUUIDPipe({ version: '4' })) restaurantId: string,
    @UploadedFiles() photos: UploadedMenuPhoto[] = [],
  ): Promise<PublishedMenu> {
    try {
      return await this.digitizeMenu.execute({
        photos: photos.map((photo) => ({
          bytes: photo.buffer,
          contentType: photo.mimetype,
          originalName: photo.originalname,
        })),
        principal,
        restaurantId,
      });
    } catch (error) {
      throwDigitizationHttpError(error);
    }
  }

  @Post('publish')
  async publish(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('restaurantId', new ParseUUIDPipe({ version: '4' })) restaurantId: string,
  ): Promise<PublishedMenu> {
    try {
      return await this.publishMenu.execute({ principal, restaurantId });
    } catch (error) {
      throwDigitizationHttpError(error);
    }
  }

  @Post('template')
  async template(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('restaurantId', new ParseUUIDPipe({ version: '4' })) restaurantId: string,
    @Body() input: { template?: unknown },
  ): Promise<PublishedMenu> {
    try {
      return await this.setMenuTemplate.execute({
        principal,
        restaurantId,
        template: input.template,
      });
    } catch (error) {
      throwDigitizationHttpError(error);
    }
  }
}
