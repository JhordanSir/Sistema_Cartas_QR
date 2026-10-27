import { AuthRole } from '../../../auth/domain/auth-role.js';
import type { AuthPrincipal } from '../../../auth/domain/auth.types.js';
import type {
  RestaurantQrRepository,
  StoredRestaurantQr,
} from '../ports/restaurant-qr.repository.js';
import type { RestaurantQrRenderer } from '../ports/restaurant-services.js';
import { GenerateRestaurantQr } from './generate-restaurant-qr.js';

const RESTAURANT_ID = '33333333-3333-4333-8333-333333333333';
const principal: AuthPrincipal = {
  accountId: '44444444-4444-4444-8444-444444444444',
  email: 'owner@example.com',
  role: AuthRole.OWNER,
  sessionId: '55555555-5555-4555-8555-555555555555',
};

const MATERIALIZED_QR = {
  qrPayload: 'https://cartas.example.com/slug-inmutable',
  qrPng: Uint8Array.from([137, 80, 78, 71]),
  qrSvg: Buffer.from('<svg>estable</svg>'),
  slug: 'slug-inmutable',
};

function repository(): jest.Mocked<RestaurantQrRepository> {
  return {
    findQrForOwner: jest.fn(),
    storeQrIfIncomplete: jest.fn(),
  };
}

describe('GenerateRestaurantQr', () => {
  let qrRepository: jest.Mocked<RestaurantQrRepository>;
  let renderer: jest.Mocked<RestaurantQrRenderer>;

  beforeEach(() => {
    qrRepository = repository();
    renderer = {
      render: jest.fn().mockImplementation((payload, format) =>
        Promise.resolve(Buffer.from(`${format}:${payload}`)),
      ),
    };
  });

  it('serves the same persisted QR after content or visible-name edits', async () => {
    qrRepository.findQrForOwner.mockResolvedValue(MATERIALIZED_QR);
    const useCase = new GenerateRestaurantQr(
      qrRepository,
      renderer,
      'https://another-domain.example.com',
    );

    const first = await useCase.execute({
      format: 'png',
      principal,
      restaurantId: RESTAURANT_ID,
    });
    const afterMenuOrNameEdit = await useCase.execute({
      format: 'svg',
      principal,
      restaurantId: RESTAURANT_ID,
    });

    expect(first).toMatchObject({
      contentType: 'image/png',
      fileName: 'slug-inmutable-qr.png',
      publicUrl: 'https://cartas.example.com/slug-inmutable',
    });
    expect(Buffer.from(first.bytes)).toEqual(Buffer.from(MATERIALIZED_QR.qrPng));
    expect(Buffer.from(afterMenuOrNameEdit.bytes)).toEqual(
      Buffer.from(MATERIALIZED_QR.qrSvg),
    );
    expect(renderer.render).not.toHaveBeenCalled();
    await expect(useCase.getIdentity({ principal, restaurantId: RESTAURANT_ID })).resolves.toEqual({
      publicUrl: 'https://cartas.example.com/slug-inmutable',
      slug: 'slug-inmutable',
    });
  });

  it('materializes a legacy restaurant once and persists its fixed payload', async () => {
    const legacyQr: StoredRestaurantQr = {
      qrPayload: null,
      qrPng: null,
      qrSvg: null,
      slug: 'legado',
    };
    const materialized: StoredRestaurantQr = {
      qrPayload: 'https://cartas.example.com/legado',
      qrPng: Buffer.from('png:https://cartas.example.com/legado'),
      qrSvg: Buffer.from('svg:https://cartas.example.com/legado'),
      slug: 'legado',
    };
    qrRepository.findQrForOwner
      .mockResolvedValueOnce(legacyQr)
      .mockResolvedValueOnce(materialized);
    qrRepository.storeQrIfIncomplete.mockResolvedValue(materialized);
    const useCase = new GenerateRestaurantQr(
      qrRepository,
      renderer,
      'https://cartas.example.com',
    );

    await useCase.execute({ format: 'png', principal, restaurantId: RESTAURANT_ID });
    await useCase.execute({ format: 'svg', principal, restaurantId: RESTAURANT_ID });

    expect(qrRepository.storeQrIfIncomplete).toHaveBeenCalledWith(
      principal.accountId,
      RESTAURANT_ID,
      expect.objectContaining({ qrPayload: 'https://cartas.example.com/legado' }),
    );
    expect(renderer.render).toHaveBeenCalledTimes(2);
    expect(renderer.render).toHaveBeenCalledWith(
      'https://cartas.example.com/legado',
      'png',
    );
  });

  it('does not disclose or materialize a QR outside the owner account', async () => {
    qrRepository.findQrForOwner.mockResolvedValue(null);
    const useCase = new GenerateRestaurantQr(
      qrRepository,
      renderer,
      'https://cartas.example.com',
    );

    await expect(useCase.execute({
      format: 'png',
      principal,
      restaurantId: RESTAURANT_ID,
    })).rejects.toMatchObject({ code: 'RESTAURANT_NOT_FOUND' });
    expect(renderer.render).not.toHaveBeenCalled();
  });
});
