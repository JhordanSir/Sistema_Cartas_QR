import { socialLinks, telHref, whatsappHref } from './contact';

describe('whatsappHref', () => {
  it('normaliza los formatos que suelen escribir los dueños', () => {
    expect(whatsappHref('+51 999 888 777')).toBe('https://wa.me/51999888777');
    expect(whatsappHref('51999888777')).toBe('https://wa.me/51999888777');
    expect(whatsappHref('(01) 555 0123')).toBe('https://wa.me/015550123');
  });

  it('añade el código de país a un móvil peruano escrito sin él', () => {
    expect(whatsappHref('999888777')).toBe('https://wa.me/51999888777');
    expect(whatsappHref('987 654 321')).toBe('https://wa.me/51987654321');
  });

  it('descarta valores que no pueden ser un número', () => {
    expect(whatsappHref(null)).toBeNull();
    expect(whatsappHref('')).toBeNull();
    expect(whatsappHref('escríbenos')).toBeNull();
    expect(whatsappHref('123')).toBeNull();
    expect(whatsappHref('1234567890123456789')).toBeNull();
  });
});

describe('telHref', () => {
  it('conserva el prefijo internacional cuando existe', () => {
    expect(telHref('+51 1 555 0123')).toBe('tel:+5115550123');
    expect(telHref('(01) 555 0123')).toBe('tel:015550123');
  });

  it('descarta valores vacíos o demasiado cortos', () => {
    expect(telHref(null)).toBeNull();
    expect(telHref('   ')).toBeNull();
    expect(telHref('555')).toBeNull();
  });
});

describe('socialLinks', () => {
  const empty = { facebookUrl: null, instagramUrl: null, tiktokUrl: null };

  it('devuelve solo las redes cargadas, en orden estable', () => {
    expect(
      socialLinks({
        facebookUrl: 'https://facebook.com/sirio',
        instagramUrl: 'https://instagram.com/sirio',
        tiktokUrl: null,
      }),
    ).toEqual([
      { href: 'https://instagram.com/sirio', label: 'Instagram' },
      { href: 'https://facebook.com/sirio', label: 'Facebook' },
    ]);
  });

  it('no devuelve nada cuando el perfil está vacío', () => {
    expect(socialLinks(empty)).toEqual([]);
  });

  it('descarta enlaces que no son https', () => {
    expect(
      socialLinks({
        ...empty,
        instagramUrl: 'http://instagram.com/sirio',
        tiktokUrl: 'javascript:alert(1)',
      }),
    ).toEqual([]);
  });
});
