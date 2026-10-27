import type { RestaurantLogo } from '../../domain/restaurant.types.js';
import type { RestaurantRepository } from '../ports/restaurant.repository.js';
import type { RestaurantLogoStorage } from '../ports/restaurant-services.js';

import { GetPublicRestaurantLogo } from './get-public-restaurant-logo.js';

const LOGO: RestaurantLogo = {
  bytes: new Uint8Array([1, 2, 3]),
  contentType: 'image/webp',
};

interface Harness {
  findPublicLogoPath: jest.Mock<Promise<string | null>, [string]>;
  readLogo: jest.Mock<Promise<RestaurantLogo | null>, [string]>;
  useCase: GetPublicRestaurantLogo;
}

function build(
  overrides: {
    logoPath?: string | null;
    storedLogo?: RestaurantLogo | null;
  } = {},
): Harness {
  const findPublicLogoPath = jest.fn<Promise<string | null>, [string]>(() =>
    Promise.resolve(overrides.logoPath ?? null),
  );
  const readLogo = jest.fn<Promise<RestaurantLogo | null>, [string]>(() =>
    Promise.resolve(overrides.storedLogo ?? null),
  );
  const repository = { findPublicLogoPath } as unknown as RestaurantRepository;
  const storage = { readLogo } as unknown as RestaurantLogoStorage;
  return {
    findPublicLogoPath,
    readLogo,
    useCase: new GetPublicRestaurantLogo(repository, storage),
  };
}

describe('GetPublicRestaurantLogo', () => {
  it('devuelve el logo de un restaurante habilitado', async () => {
    const { readLogo, useCase } = build({
      logoPath: 'restaurants/abc/profile/logo',
      storedLogo: LOGO,
    });

    await expect(useCase.execute('cevicheria-luna')).resolves.toEqual(LOGO);
    expect(readLogo).toHaveBeenCalledWith('restaurants/abc/profile/logo');
  });

  it('no lee el almacenamiento cuando el restaurante no expone logo', async () => {
    const { readLogo, useCase } = build({ logoPath: null });

    await expect(useCase.execute('cevicheria-luna')).resolves.toBeNull();
    expect(readLogo).not.toHaveBeenCalled();
  });

  it('devuelve null si el archivo ya no está en el volumen', async () => {
    const { useCase } = build({
      logoPath: 'restaurants/abc/profile/logo',
      storedLogo: null,
    });

    await expect(useCase.execute('cevicheria-luna')).resolves.toBeNull();
  });

  it('consulta siempre por el slug recibido', async () => {
    const { findPublicLogoPath, useCase } = build({ logoPath: null });

    await useCase.execute('otro-restaurante');

    expect(findPublicLogoPath).toHaveBeenCalledWith('otro-restaurante');
  });
});
