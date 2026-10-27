import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { AuthRole } from '../auth/domain/auth-role.js';
import type { AuthPrincipal } from '../auth/domain/auth.types.js';
import { OwnerRestaurantGuard } from '../auth/presentation/owner-restaurant.guard.js';
import { CurrentPrincipal, Public, Roles } from '../auth/presentation/auth.decorators.js';
import type { PublishedMenu } from '../digitization/domain/menu.types.js';
import {
  CreateCategory,
  DeleteCategory,
  ReorderCategories,
  UpdateCategory,
} from './application/use-cases/category.use-cases.js';
import {
  DeleteProductImage,
  GetOwnedProductImage,
  GetPublicProductImage,
  UploadProductImage,
} from './application/use-cases/product-image.use-cases.js';
import {
  CreateProduct,
  DeleteProduct,
  ReorderProducts,
  SetProductAvailability,
  UpdateProduct,
} from './application/use-cases/product.use-cases.js';
import { PRODUCT_IMAGE_LIMITS } from './domain/menu-management.types.js';
import {
  CREATE_CATEGORY,
  CREATE_PRODUCT,
  DELETE_CATEGORY,
  DELETE_PRODUCT,
  DELETE_PRODUCT_IMAGE,
  GET_OWNED_PRODUCT_IMAGE,
  GET_PUBLIC_PRODUCT_IMAGE,
  REORDER_CATEGORIES,
  REORDER_PRODUCTS,
  SET_PRODUCT_AVAILABILITY,
  UPDATE_CATEGORY,
  UPDATE_PRODUCT,
  UPLOAD_PRODUCT_IMAGE,
} from './menu-management.tokens.js';
import {
  CategoryNameDto,
  CreateProductDto,
  ProductAvailabilityDto,
  ReorderMenuItemsDto,
  UpdateProductDto,
} from './presentation/menu-management.dto.js';
import { throwMenuManagementHttpError } from './presentation/menu-management-http.errors.js';

interface UploadedProductImage {
  buffer: Buffer;
  mimetype: string;
}

@Controller('owner/restaurants/:restaurantId/menu')
@Roles(AuthRole.OWNER)
@UseGuards(OwnerRestaurantGuard)
export class MenuManagementController {
  constructor(
    @Inject(CREATE_CATEGORY) private readonly createCategory: CreateCategory,
    @Inject(UPDATE_CATEGORY) private readonly updateCategory: UpdateCategory,
    @Inject(DELETE_CATEGORY) private readonly deleteCategory: DeleteCategory,
    @Inject(REORDER_CATEGORIES) private readonly reorderCategories: ReorderCategories,
    @Inject(CREATE_PRODUCT) private readonly createProduct: CreateProduct,
    @Inject(UPDATE_PRODUCT) private readonly updateProduct: UpdateProduct,
    @Inject(SET_PRODUCT_AVAILABILITY)
    private readonly setProductAvailability: SetProductAvailability,
    @Inject(DELETE_PRODUCT) private readonly deleteProduct: DeleteProduct,
    @Inject(REORDER_PRODUCTS) private readonly reorderProducts: ReorderProducts,
    @Inject(UPLOAD_PRODUCT_IMAGE) private readonly uploadProductImage: UploadProductImage,
    @Inject(DELETE_PRODUCT_IMAGE) private readonly deleteProductImage: DeleteProductImage,
    @Inject(GET_OWNED_PRODUCT_IMAGE)
    private readonly getOwnedProductImage: GetOwnedProductImage,
  ) {}

  @Post('categories')
  async addCategory(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('restaurantId', new ParseUUIDPipe({ version: '4' })) restaurantId: string,
    @Body() input: CategoryNameDto,
  ): Promise<PublishedMenu> {
    return this.handle(() => this.createCategory.execute({ ...input, principal, restaurantId }));
  }

  @Patch('categories/:categoryId')
  async editCategory(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('restaurantId', new ParseUUIDPipe({ version: '4' })) restaurantId: string,
    @Param('categoryId', new ParseUUIDPipe({ version: '4' })) categoryId: string,
    @Body() input: CategoryNameDto,
  ): Promise<PublishedMenu> {
    return this.handle(() => this.updateCategory.execute({ categoryId, ...input, principal, restaurantId }));
  }

  @Delete('categories/:categoryId')
  async removeCategory(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('restaurantId', new ParseUUIDPipe({ version: '4' })) restaurantId: string,
    @Param('categoryId', new ParseUUIDPipe({ version: '4' })) categoryId: string,
  ): Promise<PublishedMenu> {
    return this.handle(() => this.deleteCategory.execute({ categoryId, principal, restaurantId }));
  }

  @Put('categories-order')
  async orderCategories(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('restaurantId', new ParseUUIDPipe({ version: '4' })) restaurantId: string,
    @Body() input: ReorderMenuItemsDto,
  ): Promise<PublishedMenu> {
    return this.handle(() => this.reorderCategories.execute({ ...input, principal, restaurantId }));
  }

  @Post('products')
  async addProduct(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('restaurantId', new ParseUUIDPipe({ version: '4' })) restaurantId: string,
    @Body() input: CreateProductDto,
  ): Promise<PublishedMenu> {
    return this.handle(() => this.createProduct.execute({ ...input, principal, restaurantId }));
  }

  @Patch('products/:productId')
  async editProduct(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('restaurantId', new ParseUUIDPipe({ version: '4' })) restaurantId: string,
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
    @Body() input: UpdateProductDto,
  ): Promise<PublishedMenu> {
    return this.handle(() => this.updateProduct.execute({ ...input, principal, productId, restaurantId }));
  }

  @Patch('products/:productId/availability')
  async availability(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('restaurantId', new ParseUUIDPipe({ version: '4' })) restaurantId: string,
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
    @Body() input: ProductAvailabilityDto,
  ): Promise<PublishedMenu> {
    return this.handle(() => this.setProductAvailability.execute({ ...input, principal, productId, restaurantId }));
  }

  @Delete('products/:productId')
  async removeProduct(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('restaurantId', new ParseUUIDPipe({ version: '4' })) restaurantId: string,
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
  ): Promise<PublishedMenu> {
    return this.handle(() => this.deleteProduct.execute({ principal, productId, restaurantId }));
  }

  @Put('categories/:categoryId/products-order')
  async orderProducts(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('restaurantId', new ParseUUIDPipe({ version: '4' })) restaurantId: string,
    @Param('categoryId', new ParseUUIDPipe({ version: '4' })) categoryId: string,
    @Body() input: ReorderMenuItemsDto,
  ): Promise<PublishedMenu> {
    return this.handle(() => this.reorderProducts.execute({ categoryId, ...input, principal, restaurantId }));
  }

  @Put('products/:productId/image')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: PRODUCT_IMAGE_LIMITS.maximumBytes, files: 1 } }))
  async putImage(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('restaurantId', new ParseUUIDPipe({ version: '4' })) restaurantId: string,
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
    @UploadedFile() image?: UploadedProductImage,
  ): Promise<PublishedMenu> {
    if (!image) throw new BadRequestException('Product image is required.');
    return this.handle(() => this.uploadProductImage.execute({
      image: { bytes: image.buffer, contentType: image.mimetype },
      principal,
      productId,
      restaurantId,
    }));
  }

  @Delete('products/:productId/image')
  async removeImage(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('restaurantId', new ParseUUIDPipe({ version: '4' })) restaurantId: string,
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
  ): Promise<PublishedMenu> {
    return this.handle(() => this.deleteProductImage.execute({ principal, productId, restaurantId }));
  }

  @Get('products/:productId/image')
  async ownerImage(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('restaurantId', new ParseUUIDPipe({ version: '4' })) restaurantId: string,
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
  ): Promise<StreamableFile> {
    const image = await this.handle(() => this.getOwnedProductImage.execute({ principal, productId, restaurantId }));
    if (!image) throw new NotFoundException('Product image not found.');
    return new StreamableFile(Buffer.from(image.bytes), { disposition: 'inline', type: image.contentType });
  }

  private async handle<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throwMenuManagementHttpError(error);
    }
  }
}

@Controller('restaurants/public/:slug/products')
export class PublicProductImageController {
  constructor(
    @Inject(GET_PUBLIC_PRODUCT_IMAGE)
    private readonly getPublicProductImage: GetPublicProductImage,
  ) {}

  @Public()
  @Get(':productId/image')
  async image(
    @Param('slug') slug: string,
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
  ): Promise<StreamableFile> {
    const image = await this.getPublicProductImage.execute({ productId, slug });
    if (!image) throw new NotFoundException('Product image not found.');
    return new StreamableFile(Buffer.from(image.bytes), { disposition: 'inline', type: image.contentType });
  }
}
