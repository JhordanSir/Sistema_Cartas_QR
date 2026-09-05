import "dotenv/config";

import { defineConfig, devices } from "@playwright/test";

// Reference captures for design review. This suite makes no assertions: it walks
// every screen at three widths and writes PNG files to artifacts/capturas/<label>.
// It is intentionally separate from the functional suite in playwright.config.ts.
export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  reporter: [["list"]],
  retries: 0,
  timeout: 240_000,
  use: {
    ...devices["Desktop Chrome"],
    trace: "off",
  },
  workers: 1,
});
