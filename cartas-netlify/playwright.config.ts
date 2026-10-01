import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:8888';
/** Only for the local suite: 64 hex characters, like the real one. */
const E2E_VIEW_HASH_SECRET = '0123456789abcdef'.repeat(4);

export default defineConfig({
  // `netlify dev` compiles each route on its first request (4–7 s with a cold
  // Turbopack cache), so the default 5 s is too tight for the first visit.
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  projects: [
    // Resets the local database once per run, after `netlify dev` is up.
    { name: 'base-local', testMatch: /\.setup\.ts$/ },
    {
      name: 'desktop-chromium',
      dependencies: ['base-local'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  reporter: [['list']],
  testDir: './tests/e2e',
  use: { baseURL, trace: 'retain-on-failure' },
  // `netlify dev` serves Next.js together with the local database, blobs and
  // functions, with the simulated extractor instead of Gemini and a test key
  // for the visitor hashes.
  webServer: {
    command: 'pnpm dev:netlify',
    env: { DIGITIZATION_FAKE: '1', VIEW_HASH_SECRET: E2E_VIEW_HASH_SECRET },
    reuseExistingServer: true,
    timeout: 180_000,
    url: `${baseURL}/entrar`,
  },
  workers: 1,
});
