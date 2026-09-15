import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { RestaurantStatus } from '../domain/restaurant-status.js';

/**
 * The DTOs that feed domain validation only check type and shape. Lengths, formats and
 * password rules live in the domain, which answers with a code that names the field;
 * repeating them here would reject first with a generic class-validator error.
 */
export class CreateRestaurantDto {
  @IsString()
  name!: string;

  @IsString()
  email!: string;

  @IsString()
  initialPassword!: string;
}

export class ListRestaurantsDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  query?: string;

  @IsOptional()
  @IsEnum(RestaurantStatus)
  status?: RestaurantStatus;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}

export class SetRestaurantStatusDto {
  @IsEnum(RestaurantStatus)
  status!: RestaurantStatus;
}

export class DeleteRestaurantDto {
  @IsString()
  confirmationText!: string;

  @IsBoolean()
  acknowledgePermanentDeletion!: boolean;
}

export class UpdateRestaurantProfileDto {
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  instagramUrl?: string;

  @IsOptional()
  @IsString()
  facebookUrl?: string;

  @IsOptional()
  @IsString()
  tiktokUrl?: string;
}

export enum RestaurantQrFormatDto {
  PNG = 'png',
  SVG = 'svg',
}
