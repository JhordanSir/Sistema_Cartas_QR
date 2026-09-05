import {
  Inter,
  Lato,
  Libre_Baskerville,
  Merriweather,
  Montserrat,
  Nunito,
  Open_Sans,
  Oswald,
  Playfair_Display,
  Poppins,
  Raleway,
  Roboto,
} from 'next/font/google';

/**
 * The published menu picks its typography at runtime: Gemini detects a family and
 * the owner can override it with a template. Every family in MENU_FONT_FAMILIES is
 * self-hosted here, so the diner never contacts fonts.googleapis.com.
 *
 * preload is disabled on purpose: only one of these faces is used per restaurant,
 * and the browser fetches it lazily once the menu text is painted.
 *
 * next/font only accepts literal arguments — spreading a shared options object
 * breaks its static analysis — so every call below is written out in full. Lato,
 * Poppins and Libre Baskerville are not variable fonts and require explicit weights.
 */
const interFont = Inter({ display: 'swap', preload: false, subsets: ['latin'] });
const robotoFont = Roboto({ display: 'swap', preload: false, subsets: ['latin'] });
const openSansFont = Open_Sans({ display: 'swap', preload: false, subsets: ['latin'] });
const montserratFont = Montserrat({ display: 'swap', preload: false, subsets: ['latin'] });
const playfairFont = Playfair_Display({ display: 'swap', preload: false, subsets: ['latin'] });
const merriweatherFont = Merriweather({ display: 'swap', preload: false, subsets: ['latin'] });
const oswaldFont = Oswald({ display: 'swap', preload: false, subsets: ['latin'] });
const ralewayFont = Raleway({ display: 'swap', preload: false, subsets: ['latin'] });
const nunitoFont = Nunito({ display: 'swap', preload: false, subsets: ['latin'] });

const latoFont = Lato({
  display: 'swap',
  preload: false,
  subsets: ['latin'],
  weight: ['400', '700'],
});
const poppinsFont = Poppins({
  display: 'swap',
  preload: false,
  subsets: ['latin'],
  weight: ['400', '600', '700'],
});
const libreBaskervilleFont = Libre_Baskerville({
  display: 'swap',
  preload: false,
  subsets: ['latin'],
  weight: ['400', '700'],
});

const MENU_FONTS: Record<string, { className: string }> = {
  Inter: interFont,
  Lato: latoFont,
  'Libre Baskerville': libreBaskervilleFont,
  Merriweather: merriweatherFont,
  Montserrat: montserratFont,
  Nunito: nunitoFont,
  'Open Sans': openSansFont,
  Oswald: oswaldFont,
  'Playfair Display': playfairFont,
  Poppins: poppinsFont,
  Raleway: ralewayFont,
  Roboto: robotoFont,
};

/**
 * Resolves the CSS class that applies a published menu font. Unknown families fall
 * back to Inter so a stale or hand-edited value never leaves the menu unstyled.
 */
export function menuFontClassName(fontFamily: string): string {
  // Object.hasOwn keeps inherited members such as "constructor" from resolving to a
  // truthy value that would slip past the fallback and produce an undefined class.
  const font = Object.hasOwn(MENU_FONTS, fontFamily) ? MENU_FONTS[fontFamily] : undefined;
  return (font ?? interFont).className;
}
