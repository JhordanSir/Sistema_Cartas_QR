// Look of the public menu (§E7): template, colors and font. It belongs to the
// published menu, never to the panel.

export type MenuTemplate = 'ORIGINAL' | 'TRADITIONAL' | 'CASUAL' | 'PREMIUM';

/** The 12 families a menu can use; any other value falls back to Inter. */
export const MENU_FONTS = [
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
] as const;

export type MenuFont = (typeof MENU_FONTS)[number];

export type MenuStyle = {
  backgroundColor: string;
  textColor: string;
  fontFamily: MenuFont;
};

export const DEFAULT_MENU_STYLE: MenuStyle = {
  backgroundColor: '#ffffff',
  fontFamily: 'Inter',
  textColor: '#111827',
};

const HEX_COLOR = /^#[0-9a-f]{6}$/;

export function isMenuFont(value: unknown): value is MenuFont {
  return typeof value === 'string' && (MENU_FONTS as readonly string[]).includes(value);
}

/** A stored style, defensively: anything malformed falls back to the defaults. */
export function parseMenuStyle(value: unknown): MenuStyle | null {
  if (typeof value !== 'object' || value === null) return null;
  const { backgroundColor, fontFamily, textColor } = value as Record<string, unknown>;
  const background = typeof backgroundColor === 'string' ? backgroundColor.toLowerCase() : '';
  const text = typeof textColor === 'string' ? textColor.toLowerCase() : '';
  if (!HEX_COLOR.test(background) || !HEX_COLOR.test(text)) return null;
  return {
    backgroundColor: background,
    fontFamily: isMenuFont(fontFamily) ? fontFamily : DEFAULT_MENU_STYLE.fontFamily,
    textColor: text,
  };
}

/**
 * The style a template gives the menu. ORIGINAL keeps what the digitization
 * detected (`source_style`), or the defaults. The other templates arrive in
 * phase 8; until then they also use the original style.
 */
export function resolveMenuStyle(_template: MenuTemplate, sourceStyle: unknown): MenuStyle {
  return parseMenuStyle(sourceStyle) ?? DEFAULT_MENU_STYLE;
}
