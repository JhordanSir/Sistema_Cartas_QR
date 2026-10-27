import type {
  ExtractedMenu,
  PublishedMenu,
} from '../../domain/menu.types.js';
import type { MenuTemplateId } from '../../domain/menu-publication.js';

export interface ProductCorrection {
  basePrice: string;
  description: string | null;
  name: string;
}

export type PublishMenuResult =
  | { kind: 'published'; menu: PublishedMenu }
  | { kind: 'empty' }
  | { kind: 'not-found' };

export interface MenuPublicationRepository {
  existsForOwner(ownerId: string, restaurantId: string): Promise<boolean>;
  findForOwner(ownerId: string, restaurantId: string): Promise<PublishedMenu | null>;
  publishForOwner(ownerId: string, restaurantId: string): Promise<PublishMenuResult>;
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
  setTemplateForOwner(
    ownerId: string,
    restaurantId: string,
    template: MenuTemplateId,
  ): Promise<PublishedMenu | null>;
}
