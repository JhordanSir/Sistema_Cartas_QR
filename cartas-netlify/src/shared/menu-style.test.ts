import { describe, expect, it } from 'vitest';

import {
  contrastRatio,
  DEFAULT_MENU_STYLE,
  ensureReadableText,
  MENU_TEMPLATES,
  MIN_TEXT_CONTRAST,
  resolveMenuStyle,
} from './menu-style';

const detected = { backgroundColor: '#FDE68A', fontFamily: 'Poppins', textColor: '#7C2D12' };

describe('resolveMenuStyle', () => {
  it('ORIGINAL usa el estilo detectado, en minúsculas', () => {
    expect(resolveMenuStyle('ORIGINAL', detected)).toEqual({
      backgroundColor: '#fde68a',
      fontFamily: 'Poppins',
      textColor: '#7c2d12',
    });
  });

  it('ORIGINAL sin estilo detectado usa blanco, #111827 e Inter', () => {
    expect(resolveMenuStyle('ORIGINAL', null)).toEqual(DEFAULT_MENU_STYLE);
    expect(DEFAULT_MENU_STYLE).toEqual({ backgroundColor: '#ffffff', fontFamily: 'Inter', textColor: '#111827' });
  });

  it.each([
    ['TRADITIONAL', { backgroundColor: '#fff8ed', fontFamily: 'Libre Baskerville', textColor: '#3d2a20' }],
    ['CASUAL', { backgroundColor: '#f1f7f0', fontFamily: 'Nunito', textColor: '#20382d' }],
    ['PREMIUM', { backgroundColor: '#1d1815', fontFamily: 'Playfair Display', textColor: '#fff3dd' }],
  ] as const)('%s ignora el estilo detectado y usa su tabla', (template, style) => {
    expect(resolveMenuStyle(template, detected)).toEqual(style);
  });

  it('todas las plantillas fijas superan el contraste mínimo', () => {
    for (const template of MENU_TEMPLATES) {
      if (!template.style) continue;
      expect(contrastRatio(template.style.textColor, template.style.backgroundColor)).toBeGreaterThanOrEqual(
        MIN_TEXT_CONTRAST,
      );
    }
  });
});

describe('contraste', () => {
  it('calcula la razón WCAG', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });

  it('un texto ilegible pasa a negro o a blanco, el que contraste más', () => {
    expect(ensureReadableText({ backgroundColor: '#ffffff', fontFamily: 'Inter', textColor: '#dddddd' }).textColor).toBe(
      '#000000',
    );
    expect(ensureReadableText({ backgroundColor: '#1d1815', fontFamily: 'Inter', textColor: '#333333' }).textColor).toBe(
      '#ffffff',
    );
  });

  it('ORIGINAL corrige el texto ilegible detectado', () => {
    const style = resolveMenuStyle('ORIGINAL', { backgroundColor: '#ffffff', fontFamily: 'Lato', textColor: '#eeeeee' });
    expect(style).toEqual({ backgroundColor: '#ffffff', fontFamily: 'Lato', textColor: '#000000' });
  });

  it('un texto legible no cambia', () => {
    const style = { backgroundColor: '#fff8ed', fontFamily: 'Inter', textColor: '#3d2a20' } as const;
    expect(ensureReadableText(style)).toBe(style);
  });
});
