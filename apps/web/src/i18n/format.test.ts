import { formatCount, formatCurrency, formatNumber } from './format';

// Intl separates the symbol with a no-break space; compare with a plain one.
const plain = (text: string) => text.replace(/ /g, ' ');

describe('formatCurrency', () => {
  it('shows soles with their symbol in Spanish', () => {
    expect(plain(formatCurrency(38, 'es'))).toBe('S/ 38.00');
  });

  it('shows the PEN code in English', () => {
    expect(plain(formatCurrency(38, 'en'))).toBe('PEN 38.00');
  });

  it('accepts the decimal strings the API returns', () => {
    expect(plain(formatCurrency('18.5', 'es'))).toBe('S/ 18.50');
    expect(plain(formatCurrency('1234.5', 'en'))).toBe('PEN 1,234.50');
  });
});

describe('formatNumber', () => {
  it('groups thousands and keeps the decimal point in both languages', () => {
    expect(formatNumber(12345, 'es')).toBe('12,345');
    expect(formatNumber(12345, 'en')).toBe('12,345');
    expect(formatNumber(3.5, 'es')).toBe('3.5');
  });
});

describe('formatCount', () => {
  const sections = { es: { one: 'sección', other: 'secciones' }, en: { one: 'section', other: 'sections' } };

  it('uses the singular only for exactly one', () => {
    expect(formatCount(1, 'es', sections.es)).toBe('1 sección');
    expect(formatCount(1, 'en', sections.en)).toBe('1 section');
  });

  it('uses the plural for zero and for many', () => {
    expect(formatCount(0, 'es', sections.es)).toBe('0 secciones');
    expect(formatCount(2, 'en', sections.en)).toBe('2 sections');
  });
});
