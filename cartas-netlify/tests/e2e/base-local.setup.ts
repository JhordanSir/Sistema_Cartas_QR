import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { expect, test as setup } from '@playwright/test';

const appRoot = fileURLToPath(new URL('../..', import.meta.url));
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

// Runs once per `pnpm test:e2e`, after Playwright has `netlify dev` up: every
// run starts from an empty LOCAL database with the current migrations.
setup('reinicia la base de datos local', async ({ baseURL, request }) => {
  if (!baseURL || !LOCAL_HOSTS.has(new URL(baseURL).hostname)) {
    throw new Error(`The E2E suite resets the local database; refusing to run against ${baseURL}.`);
  }

  execFileSync(process.execPath, ['scripts/local-db.ts', 'reset'], {
    cwd: appRoot,
    stdio: 'inherit',
  });

  const response = await request.get('/api/salud');
  expect(response.status()).toBe(200);
});
