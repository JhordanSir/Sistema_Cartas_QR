import type { RestaurantStatus } from '../../domain/restaurant-status.js';
import type {
  AssetDeletionJob,
  PaginatedRestaurants,
  PublicRestaurant,
  RestaurantSummary,
} from '../../domain/restaurant.types.js';

export interface CreateRestaurantRecord {
  email: string;
  name: string;
  passwordHash: string;
  slug: string;
}

export type CreateRestaurantResult =
  | { kind: 'created'; restaurant: RestaurantSummary }
  | { kind: 'email-conflict' }
  | { kind: 'slug-conflict' };

export interface ListRestaurantsQuery {
  page: number;
  pageSize: number;
  query?: string;
  status?: RestaurantStatus;
}

export interface RestaurantRepository {
  completeAssetDeletion(jobId: string): Promise<void>;
  create(input: CreateRestaurantRecord): Promise<CreateRestaurantResult>;
  findById(id: string): Promise<RestaurantSummary | null>;
  findPublicBySlug(slug: string): Promise<PublicRestaurant | null>;
  list(query: ListRestaurantsQuery): Promise<PaginatedRestaurants>;
  listPendingAssetDeletions(): Promise<AssetDeletionJob[]>;
  markAssetDeletionFailed(jobId: string, message: string): Promise<void>;
  scheduleDeletion(
    restaurantId: string,
    relativePath: string,
  ): Promise<AssetDeletionJob | null>;
  slugExists(slug: string): Promise<boolean>;
  updateStatus(
    id: string,
    status: RestaurantStatus,
  ): Promise<RestaurantSummary | null>;
}
