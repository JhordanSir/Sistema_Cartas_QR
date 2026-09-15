import { publicMenuCopy } from '@/i18n/messages/public-menu';

import { publicMenuMetadata } from './public-menu-metadata';

const restaurant = { address: 'Av. La Marina 1234, San Miguel', name: 'Cevichería Luna' };

describe('publicMenuMetadata', () => {
  it('describe la carta en español con la dirección del local', () => {
    expect(publicMenuMetadata(restaurant, publicMenuCopy.es.metadata)).toEqual({
      description:
        'Carta de Cevichería Luna en Av. La Marina 1234, San Miguel. Platos, precios y disponibilidad al día.',
      openGraph: {
        description:
          'Carta de Cevichería Luna en Av. La Marina 1234, San Miguel. Platos, precios y disponibilidad al día.',
        locale: 'es_PE',
        title: 'Cevichería Luna · Carta digital',
        type: 'website',
      },
      title: 'Cevichería Luna · Carta digital',
    });
  });

  it('en inglés traduce el marco pero conserva el nombre y la dirección del dueño', () => {
    const metadata = publicMenuMetadata(restaurant, publicMenuCopy.en.metadata);

    expect(metadata.title).toBe('Cevichería Luna · Digital menu');
    expect(metadata.description).toBe(
      "Cevichería Luna's menu at Av. La Marina 1234, San Miguel. Dishes, prices and availability, always up to date.",
    );
    expect(metadata.openGraph).toMatchObject({ locale: 'en_US', title: 'Cevichería Luna · Digital menu' });
  });

  it('omite la dirección cuando el local no la registró', () => {
    expect(publicMenuMetadata({ ...restaurant, address: null }, publicMenuCopy.es.metadata).description)
      .toBe('Carta de Cevichería Luna. Platos, precios y disponibilidad al día.');
  });

  it('titula la carta que no existe o está deshabilitada en cada idioma', () => {
    expect(publicMenuMetadata(null, publicMenuCopy.es.metadata)).toEqual({
      title: 'Carta no disponible | Sirio Automatiza',
    });
    expect(publicMenuMetadata(null, publicMenuCopy.en.metadata)).toEqual({
      title: 'Menu unavailable | Sirio Automatiza',
    });
  });
});
