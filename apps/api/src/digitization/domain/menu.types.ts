export const MENU_PHOTO_LIMITS = {
  acceptedContentTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
  maximumBytesPerPhoto: 3 * 1024 * 1024,
  maximumPhotoCount: 5,
  maximumTotalBytes: 12 * 1024 * 1024,
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
export type MenuPhotoContentType =
  (typeof MENU_PHOTO_LIMITS.acceptedContentTypes)[number];

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

export interface MenuExtra {
  id?: string;
  name: string;
  price: string;
}

export interface MenuVariant {
  id?: string;
  name: string;
  price: string;
}

export interface MenuProduct {
  basePrice: string;
  description: string | null;
  extras: MenuExtra[];
  id?: string;
  name: string;
  variants: MenuVariant[];
}

export interface MenuCategory {
  id?: string;
  name: string;
  products: MenuProduct[];
}

export interface ExtractedMenu {
  categories: MenuCategory[];
  style: MenuStyle;
}

export interface PublishedMenu extends ExtractedMenu {
  restaurantId: string;
  updatedAt: string;
}
