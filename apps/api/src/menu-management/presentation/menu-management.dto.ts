import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

const PRICE_PATTERN = /^\d{1,8}(?:\.\d{1,2})?$/;

export class CategoryNameDto {
  @IsString()
  @Length(1, 160)
  name!: string;
}

export class ReorderMenuItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  orderedIds!: string[];
}

export class ProductOptionDto {
  @IsString()
  @Length(1, 160)
  name!: string;

  @IsString()
  @Matches(PRICE_PATTERN)
  price!: string;
}

export class CreateProductDto {
  @IsUUID('4')
  categoryId!: string;

  @IsString()
  @Length(1, 200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string | null;

  @IsString()
  @Matches(PRICE_PATTERN)
  basePrice!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ProductOptionDto)
  variants?: ProductOptionDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ProductOptionDto)
  extras?: ProductOptionDto[];
}

export class UpdateProductDto {
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @Matches(PRICE_PATTERN)
  basePrice?: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ProductOptionDto)
  variants?: ProductOptionDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ProductOptionDto)
  extras?: ProductOptionDto[];
}

export class ProductAvailabilityDto {
  @IsBoolean()
  isAvailable!: boolean;
}
