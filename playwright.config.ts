import "dotenv/config";

import { defineConfig, devices } from "@playwright/test";

// Tests tagged @movil exercise the interface and also run on the two mobile
// profiles. The rest cover API contracts, authorization or expensive flows such as
// Gemini digitization, where running them three times would only slow the suite.
const mobileScope = /@movil/;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  workers: 1,
  use: {
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      grep: mobileScope,
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "mobile-safari",
      grep: mobileScope,
      use: { ...devices["iPhone 14"] },
    },
  ],
});
