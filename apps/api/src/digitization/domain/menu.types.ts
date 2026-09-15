import { ACCEPTED_IMAGE_TYPES, UPLOAD_LIMITS } from '@sirio/shared';

export const MENU_PHOTO_LIMITS = {
  acceptedContentTypes: ACCEPTED_IMAGE_TYPES,
  ...UPLOAD_LIMITS.menuPhotos,
};

export const MENU_FONT_FAMILIES = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Playfair Display',
  'Merriweather',
  'Oswald',
  'Raleway',
  'Nunito',
  'Libre Baskerville',
] as const;

export type MenuFontFamily = (typeof MENU_FONT_FAMILIES)[number];

export interface MenuPhoto {
  bytes: Uint8Array;
  contentType: string;
  originalName?: string;
}

export interface MenuStyle {
  backgroundColor: string;
  fontFamily: MenuFontFamily;
  textColor: string;
}

interface MenuExtra {
  id?: string;
  name: string;
  price: string;
}

interface MenuVariant {
  id?: string;
  name: string;
  price: string;
}

export interface MenuProduct {
  basePrice: string;
  description: string | null;
  extras: MenuExtra[];
  id?: string;
  imagePath: string | null;
  isAvailable: boolean;
  name: string;
  variants: MenuVariant[];
}

export const CATEGORY_LAYOUTS = ['LIST', 'CARDS'] as const;

export type CategoryLayout = (typeof CATEGORY_LAYOUTS)[number];

export const DEFAULT_CATEGORY_LAYOUT: CategoryLayout = 'LIST';

export interface MenuCategory {
  id?: string;
  /** How the published menu lays this section out. Chosen by the owner. */
  layout: CategoryLayout;
  name: string;
  products: MenuProduct[];
}

export interface ExtractedMenu {
  categories: MenuCategory[];
  style: MenuStyle;
}

export interface PublishedMenu extends ExtractedMenu {
  publication: {
    hasPublishedMenu: boolean;
    hasUnpublishedChanges: boolean;
    publishedAt: string | null;
  };
  restaurantId: string;
  template: 'ORIGINAL' | 'TRADITIONAL' | 'CASUAL' | 'PREMIUM';
  updatedAt: string;
}
