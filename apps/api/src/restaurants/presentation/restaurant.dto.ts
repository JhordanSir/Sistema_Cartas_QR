import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { RestaurantStatus } from '../domain/restaurant-status.js';

export class CreateRestaurantDto {
  @IsString()
  @Length(2, 160)
  name!: string;

  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @Length(8, 128)
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
  @MaxLength(200)
  confirmationText!: string;

  @IsBoolean()
  acknowledgePermanentDeletion!: boolean;
}

export class UpdateRestaurantProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  whatsapp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  instagramUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  facebookUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  tiktokUrl?: string;
}
