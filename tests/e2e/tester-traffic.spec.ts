import { expect, test } from "@playwright/test";

// E2E3 (Sprint 1, seccion 19): ?test=1 debe marcar de forma persistente
// al visitante como trafico interno/QA, disponible tanto en cookie
// (para el navegador) como en el estado que devuelve el backend (para
// poder excluirlo de los dashboards de PostHog).

test("?test=1 marca is_test=true de forma persistente entre paginas", async ({ page, context }) => {
  await page.goto("/?test=1");

  const cookies = await context.cookies();
  const testCookie = cookies.find((cookie) => cookie.name === "vega_test");
  expect(testCookie?.value).toBe("1");

  // Navegar sin el query param: el flag debe seguir activo via cookie.
  await page.goto("/explorar");
  const sessionResponse = await page.request.get("/api/session");
  const sessionBody = (await sessionResponse.json()) as { isTest: boolean };
  expect(sessionBody.isTest).toBe(true);

  // Y se propaga al crear el intento.
  await page.getByRole("button", { name: "Explorar mi situación" }).click();
  await expect(page).toHaveURL(/\/flow/);

  const followUpSession = await page.request.get("/api/session");
  const followUpBody = (await followUpSession.json()) as { isTest: boolean };
  expect(followUpBody.isTest).toBe(true);
});

// Suspension de trafico real (libs/experiment/constants.ts): sin ?test=1
// ya no hay un cuerpo con isTest=false que comprobar -- GET /api/session
// rechaza directamente con 503 antes de resolver identidad alguna. Esta
// es, de hecho, la cobertura explicita de "GET /api/session real
// devuelve 503" (ver tests/integration/suspension.test.ts para el
// equivalente a nivel de integracion).
test("sin ?test=1 el visitante real recibe 503 (suspension de trafico real activa)", async ({ page }) => {
  await page.goto("/explorar");
  const sessionResponse = await page.request.get("/api/session");
  expect(sessionResponse.status()).toBe(503);
});
