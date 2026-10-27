import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import type { CategoryLayout } from '../../digitization/domain/menu.types.js';

// These DTOs only check type and shape. Lengths, price format, UUIDs, layouts, option
// limits and ordering rules live in menu-management.validation.ts, which answers with a
// code that names the field; repeating them here would reject first with a generic
// class-validator error.

export class CategoryNameDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  layout?: CategoryLayout;
}

export class ReorderMenuItemsDto {
  @IsArray()
  orderedIds!: string[];
}

export class ProductOptionDto {
  @IsString()
  name!: string;

  @IsString()
  price!: string;
}

export class CreateProductDto {
  @IsString()
  categoryId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsString()
  basePrice!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductOptionDto)
  variants?: ProductOptionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductOptionDto)
  extras?: ProductOptionDto[];
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  basePrice?: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductOptionDto)
  variants?: ProductOptionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductOptionDto)
  extras?: ProductOptionDto[];
}

export class ProductAvailabilityDto {
  @IsBoolean()
  isAvailable!: boolean;
}
