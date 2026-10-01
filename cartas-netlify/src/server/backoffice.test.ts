import { describe, expect, it } from 'vitest';

import { containsPattern } from './backoffice';

describe('búsqueda del backoffice', () => {
  it('busca el texto en cualquier parte', () => {
    expect(containsPattern('luna')).toBe('%luna%');
  });

  it('los comodines del usuario se buscan tal cual', () => {
    expect(containsPattern('50%_off\\')).toBe('%50\\%\\_off\\\\%');
  });
});
