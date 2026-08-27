import type { RestaurantProfile } from '../../domain/restaurant.types.js';

export interface UpdateRestaurantProfileRecord {
  address: string | null;
  contactPhone: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  logoPath?: string;
  tiktokUrl: string | null;
  whatsapp: string | null;
}

export interface RestaurantProfileRepository {
  findProfileForOwner(
    ownerId: string,
    restaurantId: string,
  ): Promise<RestaurantProfile | null>;
  listProfilesByOwner(ownerId: string): Promise<RestaurantProfile[]>;
  updateProfileForOwner(
    ownerId: string,
    restaurantId: string,
    input: UpdateRestaurantProfileRecord,
  ): Promise<RestaurantProfile | null>;
}
