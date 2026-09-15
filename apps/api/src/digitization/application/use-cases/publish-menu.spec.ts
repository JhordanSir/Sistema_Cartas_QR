import { AuthRole } from '../../../auth/domain/auth-role.js';
import type { AuthPrincipal } from '../../../auth/domain/auth.types.js';
import type { PublishedMenu } from '../../domain/menu.types.js';
import type { MenuPublicationRepository } from '../ports/menu-publication.repository.js';
import { PublishMenu, SetMenuTemplate } from './publish-menu.js';

const OWNER: AuthPrincipal = {
  accountId: 'owner-1',
  email: 'owner@example.test',
  role: AuthRole.OWNER,
  sessionId: 'session-1',
};

const menu: PublishedMenu = {
  categories: [{ layout: 'LIST', name: 'Fondos', products: [{ basePrice: '28.00', description: null, extras: [], imagePath: null, isAvailable: true, name: 'Lomo', variants: [] }] }],
  publication: { hasPublishedMenu: true, hasUnpublishedChanges: false, publishedAt: '2026-09-01T12:00:00.000Z' },
  restaurantId: 'restaurant-1',
  style: { backgroundColor: '#ffffff', fontFamily: 'Inter', textColor: '#111827' },
  template: 'CASUAL' as const,
  updatedAt: '2026-09-01T12:00:00.000Z',
};

describe('publicación explícita de carta', () => {
  const repository = {
    publishForOwner: jest.fn(),
    setTemplateForOwner: jest.fn(),
  } as unknown as MenuPublicationRepository;

  beforeEach(() => jest.clearAllMocks());

  it('solo publica el borrador cuando lo confirma un propietario', async () => {
    jest.mocked(repository.publishForOwner).mockResolvedValue({ kind: 'published', menu });

    await expect(new PublishMenu(repository).execute({
      principal: OWNER,
      restaurantId: menu.restaurantId,
    })).resolves.toEqual(menu);
    expect(repository.publishForOwner).toHaveBeenCalledWith(OWNER.accountId, menu.restaurantId);
  });

  it('evita publicar una carta sin productos disponibles', async () => {
    jest.mocked(repository.publishForOwner).mockResolvedValue({ kind: 'empty' });

    await expect(new PublishMenu(repository).execute({
      principal: OWNER,
      restaurantId: menu.restaurantId,
    })).rejects.toMatchObject({ code: 'EMPTY_MENU' });
  });

  it('acepta únicamente las plantillas curadas', async () => {
    jest.mocked(repository.setTemplateForOwner).mockResolvedValue(menu);
    const useCase = new SetMenuTemplate(repository);

    await expect(useCase.execute({
      principal: OWNER,
      restaurantId: menu.restaurantId,
      template: 'CASUAL',
    })).resolves.toEqual(menu);
    await expect(useCase.execute({
      principal: OWNER,
      restaurantId: menu.restaurantId,
      template: 'NEON',
    })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      problem: { code: 'MENU_TEMPLATE_INVALID' },
    });
  });
});
