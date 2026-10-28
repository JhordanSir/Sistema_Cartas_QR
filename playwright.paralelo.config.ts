import { defineConfig, devices } from "@playwright/test";

// A small read-only suite that shows how Playwright runs tests in parallel. It is
// separate from the functional suite in playwright.config.ts, which stays serial.
//
// Nothing here fixes the workers, fullyParallel or the shard: they come from the
// command line, so the same tests can run every way, for example
//   pnpm test:paralelo --workers=1
//   pnpm test:paralelo --workers=4 --fully-parallel
//   pnpm test:paralelo --shard=1/2 --reporter=blob
// Without --workers, Playwright uses half of the logical CPU cores.
export default defineConfig({
  testDir: "./tests/paralelo",
  outputDir: "./artifacts/paralelo/test-results",
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "./artifacts/paralelo/html" }],
    ["./tests/paralelo/timeline-reporter.ts", { outputFolder: "./artifacts/paralelo" }],
  ],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.E2E_WEB_URL ?? "http://127.0.0.1:3000",
  },
});
