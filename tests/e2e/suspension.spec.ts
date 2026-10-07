import { expect, test } from "@playwright/test";

// Cobertura dedicada del modo suspendido (libs/experiment/constants.ts,
// EXPERIMENT_ACCEPTING_REAL_TRAFFIC=false). Complementa
// tests/integration/suspension.test.ts (contrato HTTP de /api/session y
// /api/segment) con las garantias que solo se pueden verificar con un
// navegador real: UI de /explorar, cookies que fija middleware.ts, y
// ausencia total de trafico de red hacia PostHog -- tanto para trafico
// real como para ?test=1 (ver libs/analytics/posthog-client.ts: el
// bypass que reactiva PostHog solo existe en tests/e2e/privacy.spec.ts).

test("visita real a /explorar ve el mensaje de suspension, sin tarjetas de segmento", async ({ page }) => {
  await page.goto("/explorar");

  await expect(
    page.getByText("De momento no podemos ofrecer el experimento a nuevos visitantes.")
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Explorar mi situación" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Explorar esta relación" })).toHaveCount(0);
});

test("visita real a /explorar no llama a /api/session", async ({ page }) => {
  let sessionRequests = 0;
  await page.route("**/api/session*", async (route) => {
    sessionRequests += 1;
    await route.continue();
  });

  await page.goto("/explorar");
  await page.waitForTimeout(1000);

  expect(sessionRequests).toBe(0);
});

test("visita real no genera ningun trafico de red hacia PostHog", async ({ page }) => {
  let postHogRequests = 0;
  await page.route("**://eu.i.posthog.com/**", async (route) => {
    postHogRequests += 1;
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.goto("/explorar");
  await page.waitForTimeout(1000);

  expect(postHogRequests).toBe(0);
});

test("trafico ?test=1 tampoco genera ningun trafico de red hacia PostHog mientras la suspension esta activa", async ({
  page,
}) => {
  let postHogRequests = 0;
  await page.route("**://eu.i.posthog.com/**", async (route) => {
    postHogRequests += 1;
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.goto("/explorar?test=1");
  await page.getByRole("button", { name: "Explorar mi situación" }).click();
  await expect(page).toHaveURL(/\/flow/);
  await page.waitForTimeout(1000);

  expect(postHogRequests).toBe(0);
});

test("middleware no mina vega_auid para trafico real durante la suspension", async ({ page, context }) => {
  await page.goto("/explorar");

  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === "vega_auid")).toBeUndefined();
});

test("middleware sigue marcando vega_test para ?test=1 durante la suspension", async ({ page, context }) => {
  await page.goto("/explorar?test=1");

  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === "vega_test")?.value).toBe("1");
});
