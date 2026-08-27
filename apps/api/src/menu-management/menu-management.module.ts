import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CategoryManagementRepository,
  ProductImageReadRepository,
  ProductManagementRepository,
} from './application/ports/menu-management.repositories.js';
import type { ProductImageStorage } from './application/ports/product-image.storage.js';
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
import { LocalProductImageStorage } from './infrastructure/local-product-image.storage.js';
import { PrismaMenuManagementRepository } from './infrastructure/prisma-menu-management.repository.js';
import { MenuManagementController, PublicProductImageController } from './menu-management.controller.js';
import {
  CATEGORY_REPOSITORY,
  CREATE_CATEGORY,
  CREATE_PRODUCT,
  DELETE_CATEGORY,
  DELETE_PRODUCT,
  DELETE_PRODUCT_IMAGE,
  GET_OWNED_PRODUCT_IMAGE,
  GET_PUBLIC_PRODUCT_IMAGE,
  PRODUCT_IMAGE_READ_REPOSITORY,
  PRODUCT_IMAGE_STORAGE,
  PRODUCT_REPOSITORY,
  REORDER_CATEGORIES,
  REORDER_PRODUCTS,
  SET_PRODUCT_AVAILABILITY,
  UPDATE_CATEGORY,
  UPDATE_PRODUCT,
  UPLOAD_PRODUCT_IMAGE,
} from './menu-management.tokens.js';

@Module({
  controllers: [MenuManagementController, PublicProductImageController],
  imports: [AuthModule],
  providers: [
    {
      inject: [PrismaService],
      provide: CATEGORY_REPOSITORY,
      useFactory: (prisma: PrismaService): CategoryManagementRepository =>
        new PrismaMenuManagementRepository(prisma),
    },
    {
      inject: [PrismaService],
      provide: PRODUCT_REPOSITORY,
      useFactory: (prisma: PrismaService): ProductManagementRepository =>
        new PrismaMenuManagementRepository(prisma),
    },
    {
      inject: [PrismaService],
      provide: PRODUCT_IMAGE_READ_REPOSITORY,
      useFactory: (prisma: PrismaService): ProductImageReadRepository =>
        new PrismaMenuManagementRepository(prisma),
    },
    {
      inject: [ConfigService],
      provide: PRODUCT_IMAGE_STORAGE,
      useFactory: (config: ConfigService): ProductImageStorage =>
        new LocalProductImageStorage(config.getOrThrow<string>('STORAGE_PATH')),
    },
    {
      inject: [CATEGORY_REPOSITORY],
      provide: CREATE_CATEGORY,
      useFactory: (repository: CategoryManagementRepository): CreateCategory =>
        new CreateCategory(repository),
    },
    {
      inject: [CATEGORY_REPOSITORY],
      provide: UPDATE_CATEGORY,
      useFactory: (repository: CategoryManagementRepository): UpdateCategory =>
        new UpdateCategory(repository),
    },
    {
      inject: [CATEGORY_REPOSITORY, PRODUCT_IMAGE_STORAGE],
      provide: DELETE_CATEGORY,
      useFactory: (
        repository: CategoryManagementRepository,
        storage: ProductImageStorage,
      ): DeleteCategory => new DeleteCategory(repository, storage),
    },
    {
      inject: [CATEGORY_REPOSITORY],
      provide: REORDER_CATEGORIES,
      useFactory: (repository: CategoryManagementRepository): ReorderCategories =>
        new ReorderCategories(repository),
    },
    {
      inject: [PRODUCT_REPOSITORY],
      provide: CREATE_PRODUCT,
      useFactory: (repository: ProductManagementRepository): CreateProduct =>
        new CreateProduct(repository),
    },
    {
      inject: [PRODUCT_REPOSITORY],
      provide: UPDATE_PRODUCT,
      useFactory: (repository: ProductManagementRepository): UpdateProduct =>
        new UpdateProduct(repository),
    },
    {
      inject: [PRODUCT_REPOSITORY],
      provide: SET_PRODUCT_AVAILABILITY,
      useFactory: (
        repository: ProductManagementRepository,
      ): SetProductAvailability => new SetProductAvailability(repository),
    },
    {
      inject: [PRODUCT_REPOSITORY, PRODUCT_IMAGE_STORAGE],
      provide: DELETE_PRODUCT,
      useFactory: (
        repository: ProductManagementRepository,
        storage: ProductImageStorage,
      ): DeleteProduct => new DeleteProduct(repository, storage),
    },
    {
      inject: [PRODUCT_REPOSITORY],
      provide: REORDER_PRODUCTS,
      useFactory: (repository: ProductManagementRepository): ReorderProducts =>
        new ReorderProducts(repository),
    },
    {
      inject: [PRODUCT_REPOSITORY, PRODUCT_IMAGE_STORAGE],
      provide: UPLOAD_PRODUCT_IMAGE,
      useFactory: (
        repository: ProductManagementRepository,
        storage: ProductImageStorage,
      ): UploadProductImage => new UploadProductImage(repository, storage),
    },
    {
      inject: [PRODUCT_REPOSITORY, PRODUCT_IMAGE_STORAGE],
      provide: DELETE_PRODUCT_IMAGE,
      useFactory: (
        repository: ProductManagementRepository,
        storage: ProductImageStorage,
      ): DeleteProductImage => new DeleteProductImage(repository, storage),
    },
    {
      inject: [PRODUCT_IMAGE_READ_REPOSITORY, PRODUCT_IMAGE_STORAGE],
      provide: GET_OWNED_PRODUCT_IMAGE,
      useFactory: (
        repository: ProductImageReadRepository,
        storage: ProductImageStorage,
      ): GetOwnedProductImage => new GetOwnedProductImage(repository, storage),
    },
    {
      inject: [PRODUCT_IMAGE_READ_REPOSITORY, PRODUCT_IMAGE_STORAGE],
      provide: GET_PUBLIC_PRODUCT_IMAGE,
      useFactory: (
        repository: ProductImageReadRepository,
        storage: ProductImageStorage,
      ): GetPublicProductImage => new GetPublicProductImage(repository, storage),
    },
  ],
})
export class MenuManagementModule {}
