import type { ApiErrorCode, ApiProblem } from '@sirio/shared';

import { describeApiError } from '../api-errors';

import { apiErrorCopy } from './api-errors';

// One realistic example per code. The mapped type turns a code added to the shared
// catalog without an example here into a compile error.
const EXAMPLES: { [Code in ApiErrorCode]: Extract<ApiProblem, { code: Code }> } = {
  ACCESS_DENIED: { code: 'ACCESS_DENIED' },
  ACCOUNT_NOT_FOUND: { code: 'ACCOUNT_NOT_FOUND' },
  CATEGORY_LAYOUT_INVALID: { code: 'CATEGORY_LAYOUT_INVALID' },
  CATEGORY_NOT_FOUND: { code: 'CATEGORY_NOT_FOUND' },
  CURRENT_PASSWORD_INVALID: { code: 'CURRENT_PASSWORD_INVALID' },
  DELETION_CONFIRMATION_MISMATCH: {
    code: 'DELETION_CONFIRMATION_MISMATCH',
    params: { slug: 'luna' },
  },
  FIELD_INVALID: { code: 'FIELD_INVALID', params: { field: 'productName' } },
  FIELD_PRICE_INVALID: { code: 'FIELD_PRICE_INVALID', params: { field: 'variantPrice' } },
  INVALID_CREDENTIALS: { code: 'INVALID_CREDENTIALS' },
  INVALID_ORIGIN: { code: 'INVALID_ORIGIN' },
  LOGO_FORMAT_INVALID: { code: 'LOGO_FORMAT_INVALID' },
  LOGO_TOO_LARGE: { code: 'LOGO_TOO_LARGE', params: { maxMb: 2 } },
  MENU_EMPTY: { code: 'MENU_EMPTY' },
  MENU_ORDER_DUPLICATED: { code: 'MENU_ORDER_DUPLICATED' },
  MENU_ORDER_INCOMPLETE: { code: 'MENU_ORDER_INCOMPLETE', params: { subject: 'products' } },
  MENU_PHOTO_COUNT: { code: 'MENU_PHOTO_COUNT', params: { max: 5 } },
  MENU_PHOTO_INVALID: { code: 'MENU_PHOTO_INVALID', params: { maxMb: 3 } },
  MENU_PHOTOS_TOO_LARGE: { code: 'MENU_PHOTOS_TOO_LARGE', params: { maxMb: 12 } },
  MENU_TEMPLATE_INVALID: { code: 'MENU_TEMPLATE_INVALID' },
  MODEL_MISCONFIGURED: { code: 'MODEL_MISCONFIGURED' },
  MODEL_RESPONSE_UNREADABLE: { code: 'MODEL_RESPONSE_UNREADABLE' },
  MODEL_TIMEOUT: { code: 'MODEL_TIMEOUT' },
  MODEL_UNAVAILABLE: { code: 'MODEL_UNAVAILABLE' },
  OWNER_EMAIL_INVALID: { code: 'OWNER_EMAIL_INVALID' },
  OWNER_EMAIL_TAKEN: { code: 'OWNER_EMAIL_TAKEN' },
  PASSWORD_COMPLEXITY: { code: 'PASSWORD_COMPLEXITY' },
  PASSWORD_LENGTH: { code: 'PASSWORD_LENGTH', params: { max: 128, min: 8 } },
  PASSWORD_REUSE: { code: 'PASSWORD_REUSE' },
  PRODUCT_AVAILABILITY_INVALID: { code: 'PRODUCT_AVAILABILITY_INVALID' },
  PRODUCT_IMAGE_INVALID: { code: 'PRODUCT_IMAGE_INVALID', params: { maxMb: 4 } },
  PRODUCT_IMAGE_REQUIRED: { code: 'PRODUCT_IMAGE_REQUIRED' },
  PRODUCT_NOT_FOUND: { code: 'PRODUCT_NOT_FOUND' },
  PRODUCT_OPTION_DUPLICATED: { code: 'PRODUCT_OPTION_DUPLICATED', params: { kind: 'extra' } },
  PRODUCT_OPTION_INVALID: {
    code: 'PRODUCT_OPTION_INVALID',
    params: { kind: 'variant', position: 2 },
  },
  PRODUCT_OPTION_LIMIT: { code: 'PRODUCT_OPTION_LIMIT', params: { kind: 'extra', max: 30 } },
  PRODUCT_PATCH_EMPTY: { code: 'PRODUCT_PATCH_EMPTY' },
  PROFILE_FIELD_TOO_LONG: {
    code: 'PROFILE_FIELD_TOO_LONG',
    params: { field: 'contactPhone', max: 32 },
  },
  PROFILE_PHONE_INVALID: { code: 'PROFILE_PHONE_INVALID' },
  PROFILE_WHATSAPP_INVALID: { code: 'PROFILE_WHATSAPP_INVALID' },
  QR_UNAVAILABLE: { code: 'QR_UNAVAILABLE' },
  REQUEST_INVALID: { code: 'REQUEST_INVALID' },
  RESTAURANT_NAME_LENGTH: { code: 'RESTAURANT_NAME_LENGTH', params: { max: 160, min: 2 } },
  RESTAURANT_NOT_FOUND: { code: 'RESTAURANT_NOT_FOUND' },
  ROLE_MISMATCH: { code: 'ROLE_MISMATCH' },
  SESSION_EXPIRED: { code: 'SESSION_EXPIRED' },
  SLUG_UNAVAILABLE: { code: 'SLUG_UNAVAILABLE' },
  SOCIAL_URL_INCOMPLETE: { code: 'SOCIAL_URL_INCOMPLETE', params: { network: 'tiktok' } },
  SOCIAL_URL_MISMATCH: { code: 'SOCIAL_URL_MISMATCH', params: { network: 'facebook' } },
};

// 418 has no fallback of its own, so a code that silently falls back is caught below.
const STATUS = 418;
const problems = Object.values(EXAMPLES);

describe('API error messages', () => {
  it.each(problems)('explain $code in both languages without leftovers', (problem) => {
    const spanish = describeApiError(problem, STATUS, apiErrorCopy.es);
    const english = describeApiError(problem, STATUS, apiErrorCopy.en);

    for (const text of [spanish, english]) {
      expect(text.trim()).not.toBe('');
      expect(text).not.toMatch(/undefined|\[object Object\]|NaN/);
    }
    expect(english).not.toMatch(/[áéíóúñ¿¡]/i);
    expect(english).not.toBe(spanish);
  });

  it('never fall back silently for a known code', () => {
    const fellBack = problems.filter(
      (problem) =>
        problem.code !== 'REQUEST_INVALID' &&
        describeApiError(problem, STATUS, apiErrorCopy.es) === apiErrorCopy.es.fallback.badRequest,
    );
    expect(fellBack).toEqual([]);
  });

  it.each([
    [EXAMPLES.LOGO_TOO_LARGE, 'El logo debe pesar como máximo 2 MB.'],
    [EXAMPLES.MENU_EMPTY, 'Agrega al menos un producto disponible antes de publicar la carta.'],
    [EXAMPLES.FIELD_PRICE_INVALID, 'El campo precio de variante no es un precio válido.'],
    [EXAMPLES.MENU_ORDER_INCOMPLETE, 'El orden debe incluir todos los productos de la categoría una sola vez.'],
    [EXAMPLES.MODEL_TIMEOUT, 'Gemini tardó demasiado en responder. Inténtalo nuevamente.'],
  ])('keep the Spanish wording the API already used for $code', (problem, text) => {
    expect(describeApiError(problem, STATUS, apiErrorCopy.es)).toBe(text);
  });

  it('fix the plurals and gender the API got wrong', () => {
    expect(describeApiError(EXAMPLES.PRODUCT_OPTION_LIMIT, STATUS, apiErrorCopy.es)).toBe(
      'El producto admite hasta 30 adicionales.',
    );
    expect(describeApiError(EXAMPLES.PRODUCT_OPTION_INVALID, STATUS, apiErrorCopy.es)).toBe(
      'La variante 2 no es válida.',
    );
  });

  it('name profile fields in words, never by their internal key', () => {
    const text = describeApiError(EXAMPLES.PROFILE_FIELD_TOO_LONG, STATUS, apiErrorCopy.es);
    expect(text).toBe('El teléfono supera el máximo de 32 caracteres.');
    expect(text).not.toContain('contactPhone');
  });
});
