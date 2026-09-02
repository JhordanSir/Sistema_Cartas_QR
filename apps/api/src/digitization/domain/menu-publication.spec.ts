import { preserveCurrentPublicMenu, toOwnedMenu } from './menu-publication.js';

const baseRecord = {
  backgroundColor: '#ffffff',
  categories: [{
    id: 'category-1',
    name: 'Fondos',
    products: [{
      basePrice: { toFixed: (): string => '24.00' },
      description: null,
      extras: [],
      id: 'product-1',
      imagePath: null,
      isAvailable: true,
      name: 'Lomo saltado',
      variants: [],
    }],
  }],
  fontFamily: 'Inter',
  id: 'restaurant-1',
  menuTemplate: 'ORIGINAL',
  publishedAt: null,
  publishedMenu: null,
  textColor: '#111827',
  updatedAt: new Date('2026-09-01T12:00:00.000Z'),
};

describe('estado de publicación de carta', () => {
  it('mantiene privada una carta nueva hasta la publicación explícita', () => {
    const menu = toOwnedMenu({ ...baseRecord, publicationInitialized: true });

    expect(menu.publication).toEqual({
      hasPublishedMenu: false,
      hasUnpublishedChanges: true,
      publishedAt: null,
    });
  });

  it('reconoce las cartas heredadas como publicadas durante la transición', () => {
    const menu = toOwnedMenu({ ...baseRecord, publicationInitialized: false });

    expect(menu.publication.hasPublishedMenu).toBe(true);
  });

  it('no marca cambios cuando PostgreSQL devuelve el snapshot con otro orden de claves', () => {
    const menu = toOwnedMenu({
      ...baseRecord,
      publicationInitialized: true,
      publishedMenu: {
        style: { textColor: '#111827', fontFamily: 'Inter', backgroundColor: '#ffffff' },
        categories: [{
          products: [{
            variants: [],
            name: 'Lomo saltado',
            isAvailable: true,
            imagePath: null,
            id: 'product-1',
            extras: [],
            description: null,
            basePrice: '24.00',
          }],
          name: 'Fondos',
          id: 'category-1',
        }],
      },
    });

    expect(menu.publication.hasUnpublishedChanges).toBe(false);
  });

  it('no convierte un borrador nuevo en público al cambiar su plantilla', async () => {
    const transaction = {
      restaurant: {
        findUnique: jest.fn().mockResolvedValue({
          ...baseRecord,
          publicationInitialized: true,
        }),
        update: jest.fn(),
      },
    };

    await preserveCurrentPublicMenu(transaction as never, baseRecord.id);

    expect(transaction.restaurant.update).not.toHaveBeenCalled();
  });
});
