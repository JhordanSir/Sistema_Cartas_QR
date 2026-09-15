import { formatCurrency } from './format';

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
