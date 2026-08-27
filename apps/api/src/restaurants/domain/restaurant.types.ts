import type { RestaurantStatus } from './restaurant-status.js';

export interface RestaurantOwnerSummary {
  email: string;
  id: string;
  isActive: boolean;
}

export interface RestaurantSummary {
  createdAt: string;
  id: string;
  name: string;
  owner: RestaurantOwnerSummary;
  slug: string;
  status: RestaurantStatus;
  updatedAt: string;
}

export interface PublicRestaurant {
  backgroundColor: string;
  fontFamily: string;
  id: string;
  logoPath: string | null;
  name: string;
  slug: string;
  textColor: string;
}

export interface RestaurantProfile {
  address: string | null;
  contactPhone: string | null;
  facebookUrl: string | null;
  id: string;
  instagramUrl: string | null;
  logoPath: string | null;
  name: string;
  slug: string;
  status: RestaurantStatus;
  tiktokUrl: string | null;
  updatedAt: string;
  whatsapp: string | null;
}

export interface RestaurantLogo {
  bytes: Uint8Array;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface PaginatedRestaurants {
  items: RestaurantSummary[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AssetDeletionJob {
  id: string;
  relativePath: string;
  restaurantId: string;
}
