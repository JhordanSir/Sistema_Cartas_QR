import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { UpdateExtractedProduct } from './application/use-cases/update-extracted-product.js';
import { MENU_PHOTO_LIMITS, type PublishedMenu } from './domain/menu.types.js';
import {
  DIGITIZE_MENU,
  GET_OWNED_MENU,
  UPDATE_EXTRACTED_PRODUCT,
} from './digitization.tokens.js';
import { UpdateExtractedProductDto } from './presentation/digitization.dto.js';
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
    @Inject(UPDATE_EXTRACTED_PRODUCT)
    private readonly updateExtractedProduct: UpdateExtractedProduct,
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

  @Patch('products/:productId')
  async updateProduct(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('restaurantId', new ParseUUIDPipe({ version: '4' })) restaurantId: string,
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
    @Body() input: UpdateExtractedProductDto,
  ): Promise<PublishedMenu> {
    try {
      return await this.updateExtractedProduct.execute({
        ...input,
        description: input.description ?? null,
        principal,
        productId,
        restaurantId,
      });
    } catch (error) {
      throwDigitizationHttpError(error);
    }
  }
}
