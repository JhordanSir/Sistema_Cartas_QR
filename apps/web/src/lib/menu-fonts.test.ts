import { menuFontClassName } from './menu-fonts';

// The 12 families the API can publish (MENU_FONT_FAMILIES in the digitization domain).
const PUBLISHABLE_FAMILIES = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Playfair Display',
  'Merriweather',
  'Oswald',
  'Raleway',
  'Nunito',
  'Libre Baskerville',
];

describe('menuFontClassName', () => {
  it('resuelve una clase para cada familia que la API puede publicar', () => {
    for (const family of PUBLISHABLE_FAMILIES) {
      expect(menuFontClassName(family)).toEqual(expect.any(String));
      expect(menuFontClassName(family)).not.toBe('');
    }
  });

  it('usa la misma clase para la misma familia', () => {
    expect(menuFontClassName('Montserrat')).toBe(menuFontClassName('Montserrat'));
  });

  it('cae en la familia por defecto cuando el valor guardado no existe', () => {
    const fallback = menuFontClassName('Inter');

    expect(menuFontClassName('Comic Sans MS')).toBe(fallback);
    expect(menuFontClassName('')).toBe(fallback);
    expect(menuFontClassName('inter')).toBe(fallback);
  });

  it('no hereda propiedades del prototipo de Object', () => {
    const fallback = menuFontClassName('Inter');

    expect(menuFontClassName('constructor')).toBe(fallback);
    expect(menuFontClassName('toString')).toBe(fallback);
  });
});
