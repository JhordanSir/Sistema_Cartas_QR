import { describeApiError, readApiError } from './api-errors';
import { apiErrorCopy } from './messages/api-errors';

const es = apiErrorCopy.es;
const en = apiErrorCopy.en;

describe('describeApiError', () => {
  it('translates a code that needs no values', () => {
    const body = { code: 'OWNER_EMAIL_TAKEN', message: 'An owner account already uses this email' };

    expect(describeApiError(body, 409, es)).toBe('Ya existe una cuenta de propietario con ese correo.');
    expect(describeApiError(body, 409, en)).toBe('An owner account already uses that email.');
  });

  it('fills in the values a code carries', () => {
    const body = { code: 'SOCIAL_URL_MISMATCH', params: { network: 'instagram' } };

    expect(describeApiError(body, 400, es)).toBe(
      'El enlace no corresponde a Instagram o no usa HTTPS.',
    );
    expect(describeApiError(body, 400, en)).toBe(
      "The link doesn't point to Instagram or doesn't use HTTPS.",
    );
  });

  it('never shows the raw message, even when a code is missing', () => {
    const body = { message: ['name must be longer than or equal to 1 characters'], statusCode: 400 };

    expect(describeApiError(body, 400, es)).toBe('Revisa los datos e inténtalo de nuevo.');
  });

  it('falls back by status when a code that needs values arrives without them', () => {
    expect(describeApiError({ code: 'LOGO_TOO_LARGE' }, 400, en)).toBe(
      'Check the details and try again.',
    );
  });

  it('falls back by status for a code this build does not know', () => {
    expect(describeApiError({ code: 'SOMETHING_NEW' }, 404, es)).toBe('No encontramos lo que buscabas.');
  });

  it.each([
    [401, 'Tu sesión expiró. Vuelve a ingresar.'],
    [403, 'Tu sesión expiró. Vuelve a ingresar.'],
    [404, 'No encontramos lo que buscabas.'],
    [409, 'Revisa los datos e inténtalo de nuevo.'],
    [413, 'El archivo es demasiado grande.'],
    [500, 'No pudimos completar la operación. Vuelve a intentarlo.'],
    [502, 'No pudimos completar la operación. Vuelve a intentarlo.'],
  ])('explains a %i without a code', (status, text) => {
    expect(describeApiError(null, status, es)).toBe(text);
  });
});

describe('readApiError', () => {
  it('reads the JSON body of the response', async () => {
    const response = {
      json: async () => ({ code: 'MENU_EMPTY' }),
      status: 400,
    } as unknown as Response;

    await expect(readApiError(response, en)).resolves.toBe(
      'Add at least one available product before publishing the menu.',
    );
  });

  it('copes with a body that is not JSON, such as an nginx error page', async () => {
    const response = {
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
      status: 413,
    } as unknown as Response;

    await expect(readApiError(response, en)).resolves.toBe('The file is too large.');
  });
});
