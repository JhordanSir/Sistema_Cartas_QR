import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:8888';

export default defineConfig({
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
  // `netlify dev` serves Next.js together with the local database, blobs and functions.
  webServer: {
    command: 'pnpm dev:netlify',
    reuseExistingServer: true,
    timeout: 180_000,
    url: `${baseURL}/entrar`,
  },
  workers: 1,
});
