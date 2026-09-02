import { expect, test } from "@playwright/test";

const apiHealthUrl = process.env.E2E_HEALTH_URL ?? "http://127.0.0.1:3001";
const webUrl = process.env.E2E_WEB_URL ?? "http://127.0.0.1:3000";

test("la API responde su health check", async ({ request }) => {
  const response = await request.get(`${apiHealthUrl}/health`);

  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toMatchObject({
    service: "api",
    status: "ok",
  });
});

test("la API esta lista y conectada a PostgreSQL", async ({ request }) => {
  const response = await request.get(`${apiHealthUrl}/health/ready`);

  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toMatchObject({
    database: "up",
    service: "api",
    status: "ok",
  });
});

test("la web sirve la pagina inicial", async ({ page }) => {
  await page.goto(webUrl);

  await expect(
    page.getByRole("heading", { name: /tu carta trabaja/i }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /ingresar a mi restaurante/i })).toHaveAttribute(
    "href",
    "/admin/login",
  );
  await expect(page.getByRole("link", { name: "Administración" })).toHaveAttribute(
    "href",
    "/login",
  );
});
