import { describe, expect, it } from 'vitest';

import { homePathFor } from './routes';

describe('homePathFor', () => {
  it('lleva al dueño al panel y al administrador al backoffice', () => {
    expect(homePathFor({ mustChangePassword: false, role: 'OWNER' })).toBe('/panel');
    expect(homePathFor({ mustChangePassword: false, role: 'ADMIN' })).toBe('/admin');
  });

  it('con un cambio de contraseña pendiente, lleva a la cuenta', () => {
    expect(homePathFor({ mustChangePassword: true, role: 'OWNER' })).toBe('/panel/cuenta');
    expect(homePathFor({ mustChangePassword: true, role: 'ADMIN' })).toBe('/admin/cuenta');
  });
});
