export interface RestaurantPasswordHasher {
  hash(password: string): Promise<string>;
}

export interface RestaurantAssetStorage {
  deleteDirectory(relativePath: string): Promise<void>;
}

export interface RestaurantLogoStorage {
  readLogo(relativePath: string): Promise<RestaurantStoredLogo | null>;
  saveLogo(
    restaurantId: string,
    logo: RestaurantLogoUpload,
  ): Promise<string>;
}

export interface RestaurantLogoUpload {
  bytes: Uint8Array;
  contentType: string;
}

export interface RestaurantStoredLogo {
  bytes: Uint8Array;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface RestaurantQrRenderer {
  render(payload: string, format: RestaurantQrFormat): Promise<Uint8Array>;
}
import type {
  RestaurantQrFormat,
} from '../../domain/restaurant.types.js';
