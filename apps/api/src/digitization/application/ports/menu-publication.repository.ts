import type {
  ExtractedMenu,
  PublishedMenu,
} from '../../domain/menu.types.js';

export interface ProductCorrection {
  basePrice: string;
  description: string | null;
  name: string;
}

export interface MenuPublicationRepository {
  existsForOwner(ownerId: string, restaurantId: string): Promise<boolean>;
  findForOwner(ownerId: string, restaurantId: string): Promise<PublishedMenu | null>;
  replaceForOwner(
    ownerId: string,
    restaurantId: string,
    menu: ExtractedMenu,
  ): Promise<PublishedMenu | null>;
  updateProductForOwner(
    ownerId: string,
    restaurantId: string,
    productId: string,
    correction: ProductCorrection,
  ): Promise<PublishedMenu | null>;
}
