import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:8888';

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  projects: [{ name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } }],
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
