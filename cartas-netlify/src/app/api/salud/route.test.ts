import { beforeEach, describe, expect, it, vi } from 'vitest';

const { isDatabaseUp } = vi.hoisted(() => ({ isDatabaseUp: vi.fn<() => Promise<boolean>>() }));
vi.mock('@/server/health', () => ({ isDatabaseUp }));

import { GET } from './route';

describe('GET /api/salud', () => {
  beforeEach(() => {
    isDatabaseUp.mockReset();
  });

  it('responde 200 con la base de datos activa', async () => {
    isDatabaseUp.mockResolvedValue(true);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ ok: true, database: 'up' });
  });

  it('responde 503 sin detalles cuando la base de datos falla', async () => {
    isDatabaseUp.mockResolvedValue(false);

    const response = await GET();

    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ ok: false });
  });
});
