import { expect, test } from "@playwright/test";

const apiUrl = process.env.E2E_API_URL ?? "http://127.0.0.1:3001";
const webUrl = process.env.E2E_WEB_URL ?? "http://127.0.0.1:3000";

test("la API responde su health check", async ({ request }) => {
  const response = await request.get(`${apiUrl}/health`);

  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toMatchObject({
    service: "api",
    status: "ok",
  });
});

test("la web sirve la pagina inicial", async ({ page }) => {
  await page.goto(webUrl);

  await expect(
    page.getByRole("heading", { name: /tu carta digital/i }),
  ).toBeVisible();
});
