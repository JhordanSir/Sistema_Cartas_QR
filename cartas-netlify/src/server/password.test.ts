import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from './password';

describe('hashPassword y verifyPassword', () => {
  it('usa Argon2id con los parámetros de la especificación y sal aleatoria', async () => {
    const first = await hashPassword('Ñandú2024');
    const second = await hashPassword('Ñandú2024');

    expect(first).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(first).not.toBe(second);
  });

  it('verifica la contraseña correcta y rechaza otra', async () => {
    const hash = await hashPassword('Ñandú2024');

    await expect(verifyPassword('Ñandú2024', hash)).resolves.toBe(true);
    await expect(verifyPassword('ñandú2024', hash)).resolves.toBe(false);
  });

  it('acepta el acento compuesto o descompuesto como la misma contraseña', async () => {
    const hash = await hashPassword('Ñandú2024'.normalize('NFC'));

    await expect(verifyPassword('Ñandú2024'.normalize('NFD'), hash)).resolves.toBe(true);
  });

  it('responde falso ante un hash dañado en lugar de lanzar', async () => {
    await expect(verifyPassword('Ñandú2024', 'no-es-un-hash')).resolves.toBe(false);
  });
});
