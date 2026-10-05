import { describe, expect, it } from 'vitest';

import { describeErrorForLog, isUniqueViolation } from './db-errors';

function drizzleError(params: string, cause: unknown): Error {
  const error = new Error(`Failed query: insert into accounts (email, password_hash) values ($1, $2)\nparams: ${params}`, {
    cause,
  });
  error.name = 'DrizzleQueryError';
  return error;
}

describe('describeErrorForLog', () => {
  it('nunca registra los parámetros de la consulta, ni en el mensaje ni en la traza', () => {
    const logged = JSON.stringify(
      describeErrorForLog(drizzleError('dueno@sirio.test,$argon2id$v=19$secreto', new Error('socket hang up'))),
    );

    expect(logged).toContain('Failed query: insert into accounts');
    expect(logged).not.toContain('dueno@sirio.test');
    expect(logged).not.toContain('argon2id');
  });

  it('incluye la causa real, que el mensaje de Drizzle no dice', () => {
    const logged = describeErrorForLog(drizzleError('x', new TypeError('This function can now be called only as a tagged-template function')));

    expect(logged).toMatchObject({
      cause: { message: 'This function can now be called only as a tagged-template function', name: 'TypeError' },
      name: 'DrizzleQueryError',
    });
  });

  it('con un error de Postgres debajo, registra solo su código, su restricción y su mensaje', () => {
    const postgres = Object.assign(new Error('duplicate key value violates unique constraint'), {
      code: '23505',
      constraint: 'accounts_email_key',
    });

    expect(describeErrorForLog(drizzleError('dueno@sirio.test', postgres))).toEqual({
      code: '23505',
      constraint: 'accounts_email_key',
      message: 'duplicate key value violates unique constraint',
    });
    expect(isUniqueViolation(drizzleError('x', postgres), 'accounts_email_key')).toBe(true);
  });

  it('describe también lo que no es un Error', () => {
    expect(describeErrorForLog('se cayó')).toEqual({ error: 'se cayó' });
  });
});
