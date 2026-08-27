export type RestaurantStatus = 'ENABLED' | 'DISABLED';

export interface RestaurantSummary {
  createdAt: string;
  id: string;
  name: string;
  owner: {
    email: string;
    id: string;
    isActive: boolean;
  };
  slug: string;
  status: RestaurantStatus;
  updatedAt: string;
}

export interface PaginatedRestaurants {
  items: RestaurantSummary[];
  page: number;
  pageSize: number;
  total: number;
}

export interface PublicRestaurant {
  backgroundColor: string;
  categories: MenuCategory[];
  fontFamily: string;
  id: string;
  logoPath: string | null;
  name: string;
  slug: string;
  textColor: string;
}

export interface MenuOption {
  id?: string;
  name: string;
  price: string;
}

export interface MenuProduct {
  basePrice: string;
  description: string | null;
  extras: MenuOption[];
  hasImage?: boolean;
  id?: string;
  imagePath?: string | null;
  isAvailable?: boolean;
  name: string;
  variants: MenuOption[];
}

export interface MenuCategory {
  id?: string;
  name: string;
  products: MenuProduct[];
}

export interface PublishedMenu {
  categories: MenuCategory[];
  restaurantId: string;
  style: {
    backgroundColor: string;
    fontFamily: string;
    textColor: string;
  };
  updatedAt: string;
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
