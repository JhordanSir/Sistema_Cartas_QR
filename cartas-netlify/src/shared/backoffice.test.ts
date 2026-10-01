import { describe, expect, it } from 'vitest';

import { backofficeHref, deletePhrase, parseBackofficeQuery } from './backoffice';

describe('backoffice', () => {
  it('la frase para eliminar es ELIMINAR seguida del slug', () => {
    expect(deletePhrase('cevicheria-luna')).toBe('ELIMINAR cevicheria-luna');
  });

  it('normaliza la búsqueda y la página', () => {
    expect(parseBackofficeQuery({ page: '3', q: '  Cevichería   Luna ' })).toEqual({ page: 3, query: 'Cevichería Luna' });
    expect(parseBackofficeQuery({})).toEqual({ page: 1, query: '' });
    expect(parseBackofficeQuery({ page: ['2', '5'], q: ['luna', 'sol'] })).toEqual({ page: 2, query: 'luna' });
  });

  it.each(['0', '-1', 'dos', ''])('una página «%s» que no es válida pasa a la 1', (page) => {
    expect(parseBackofficeQuery({ page }).page).toBe(1);
  });

  it('recorta búsquedas muy largas', () => {
    expect(parseBackofficeQuery({ q: 'a'.repeat(500) }).query).toHaveLength(160);
  });

  it('arma la dirección de cada página conservando la búsqueda', () => {
    expect(backofficeHref('', 1)).toBe('/admin');
    expect(backofficeHref('luna', 1)).toBe('/admin?q=luna');
    expect(backofficeHref('cevichería luna', 2)).toBe('/admin?q=cevicher%C3%ADa+luna&page=2');
  });
});
