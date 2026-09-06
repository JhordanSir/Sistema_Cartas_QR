import "dotenv/config";

import { defineConfig, devices } from "@playwright/test";

// Tests tagged @movil exercise the interface and also run on the two mobile
// profiles. The rest cover API contracts, authorization or expensive flows such as
// Gemini digitization, where running them three times would only slow the suite.
const mobileScope = /@movil/;

export default defineConfig({
  testDir: "./tests/e2e",
  // La suite corre en serie contra el stack real en Docker. Los 5 s por defecto de
  // Playwright son ajustados cuando la máquina va cargada, y producían fallos que
  // desaparecían al reejecutar el test aislado.
  expect: { timeout: 10_000 },
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
      // WebKit is markedly slower here than Chromium: client-side navigation and the
      // session guard routinely need more than the default 5s. Giving the profile
      // room beats scattering per-call timeouts across every spec.
      expect: { timeout: 20_000 },
      grep: mobileScope,
      name: "mobile-safari",
      timeout: 180_000,
      use: { ...devices["iPhone 14"] },
    },
  ],
});
