import { Manrope, Playfair_Display } from 'next/font/google';

/**
 * Application shell typography: owner panel, backoffice, landing and logins.
 * Both faces are variable, so no explicit weight list is needed.
 */
const displayFont = Playfair_Display({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-display-family',
});

const bodyFont = Manrope({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-body-family',
});

export const shellFontClassName = `${displayFont.variable} ${bodyFont.variable}`;
