import { describe, expect, it, vi } from 'vitest';

const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock('../../db/index', () => ({ getDb: () => ({ execute }) }));

import { isDatabaseUp } from './health';

describe('isDatabaseUp', () => {
  it('is true when `select 1` succeeds', async () => {
    execute.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

    await expect(isDatabaseUp()).resolves.toBe(true);
  });

  it('is false and logs on the server when the query fails', async () => {
    const failure = new Error('connect ECONNREFUSED 10.0.0.5:5432');
    execute.mockRejectedValueOnce(failure);
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(isDatabaseUp()).resolves.toBe(false);
    expect(log).toHaveBeenCalledWith('Database health check failed', failure);
  });
});
