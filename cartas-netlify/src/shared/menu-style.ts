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

/** The four templates of §E7, in the order the selector shows them. */
export const MENU_TEMPLATES: readonly {
  value: MenuTemplate;
  label: string;
  description: string;
  /** Fixed look; null for ORIGINAL, which takes what the digitization detected. */
  style: MenuStyle | null;
}[] = [
  {
    description: 'Conserva los colores y la tipografía detectados en tu carta.',
    label: 'Original detectado',
    style: null,
    value: 'ORIGINAL',
  },
  {
    description: 'Papel marfil y serif clásica para una carta de mesa.',
    label: 'Tradicional',
    style: { backgroundColor: '#fff8ed', fontFamily: 'Libre Baskerville', textColor: '#3d2a20' },
    value: 'TRADITIONAL',
  },
  {
    description: 'Claro, cercano y fácil de leer desde el celular.',
    label: 'Casual',
    style: { backgroundColor: '#f1f7f0', fontFamily: 'Nunito', textColor: '#20382d' },
    value: 'CASUAL',
  },
  {
    description: 'Tinta oscura y detalles cálidos para una propuesta más sobria.',
    label: 'Premium',
    style: { backgroundColor: '#1d1815', fontFamily: 'Playfair Display', textColor: '#fff3dd' },
    value: 'PREMIUM',
  },
];

export function isMenuTemplate(value: unknown): value is MenuTemplate {
  return MENU_TEMPLATES.some((template) => template.value === value);
}

function channel(value: number): number {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a #rrggbb color. */
function luminance(hex: string): number {
  const [red = 0, green = 0, blue = 0] = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

/** WCAG contrast ratio between two #rrggbb colors, from 1 to 21. */
export function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
}

export const MIN_TEXT_CONTRAST = 4.5;

/**
 * Text that does not reach 4.5:1 against its background becomes black or
 * white, whichever contrasts more (§E10).
 */
export function ensureReadableText(style: MenuStyle): MenuStyle {
  if (contrastRatio(style.textColor, style.backgroundColor) >= MIN_TEXT_CONTRAST) return style;
  const black = contrastRatio('#000000', style.backgroundColor);
  const white = contrastRatio('#ffffff', style.backgroundColor);
  return { ...style, textColor: black >= white ? '#000000' : '#ffffff' };
}

/** The style ORIGINAL uses: the detected one made readable, or the defaults. */
export function detectedMenuStyle(sourceStyle: unknown): MenuStyle {
  const detected = parseMenuStyle(sourceStyle);
  return detected ? ensureReadableText(detected) : DEFAULT_MENU_STYLE;
}

/** The style a template gives the menu (table of §E7). */
export function resolveMenuStyle(template: MenuTemplate, sourceStyle: unknown): MenuStyle {
  const fixed = MENU_TEMPLATES.find((option) => option.value === template)?.style;
  return fixed ?? detectedMenuStyle(sourceStyle);
}
