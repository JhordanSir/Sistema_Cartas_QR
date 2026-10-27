export interface StoredRestaurantQr {
  qrPayload: string | null;
  qrPng: Uint8Array | null;
  qrSvg: Uint8Array | null;
  slug: string;
}

export interface StoreRestaurantQrInput {
  qrPayload: string;
  qrPng: Uint8Array;
  qrSvg: Uint8Array;
}

export interface RestaurantQrRepository {
  findQrForOwner(
    ownerId: string,
    restaurantId: string,
  ): Promise<StoredRestaurantQr | null>;
  storeQrIfIncomplete(
    ownerId: string,
    restaurantId: string,
    input: StoreRestaurantQrInput,
  ): Promise<StoredRestaurantQr | null>;
}
