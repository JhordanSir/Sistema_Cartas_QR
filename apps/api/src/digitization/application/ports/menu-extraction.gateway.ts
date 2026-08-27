import type { MenuPhoto } from '../../domain/menu.types.js';

export interface MenuExtractionGateway {
  extract(photos: MenuPhoto[]): Promise<unknown>;
}
