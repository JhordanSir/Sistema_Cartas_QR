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
