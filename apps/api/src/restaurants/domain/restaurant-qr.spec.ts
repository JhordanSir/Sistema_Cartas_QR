import {
  buildPublicRestaurantUrl,
  restaurantQrDownloadDisposition,
  restaurantQrFileName,
} from './restaurant-qr.js';

describe('restaurant QR identity', () => {
  it('builds the permanent public URL from the immutable slug', () => {
    expect(buildPublicRestaurantUrl('https://cartas.example.com', 'bistro-sirio')).toBe(
      'https://cartas.example.com/bistro-sirio',
    );
    expect(buildPublicRestaurantUrl('https://cartas.example.com/', 'bistro-sirio')).toBe(
      'https://cartas.example.com/bistro-sirio',
    );
    expect(buildPublicRestaurantUrl('https://cartas.example.com', '寿司-東京')).toBe(
      'https://cartas.example.com/%E5%AF%BF%E5%8F%B8-%E6%9D%B1%E4%BA%AC',
    );
  });

  it('uses a printable, stable file name for each format', () => {
    expect(restaurantQrFileName('bistro-sirio', 'png')).toBe('bistro-sirio-qr.png');
    expect(restaurantQrFileName('bistro-sirio', 'svg')).toBe('bistro-sirio-qr.svg');
  });

  it('uses an ASCII fallback and RFC 5987 encoding for Unicode downloads', () => {
    const disposition = restaurantQrDownloadDisposition('寿司-東京-qr.png');

    expect(disposition).toContain('attachment; filename="');
    expect(disposition).toContain("filename*=UTF-8''%E5%AF%BF%E5%8F%B8-%E6%9D%B1%E4%BA%AC-qr.png");
    expect(disposition).not.toContain('寿司');
  });
});
