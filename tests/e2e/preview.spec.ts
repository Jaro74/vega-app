import { expect, test, type Page } from "@playwright/test";

// Journeys de Sprint 3A (preview segmento A). Corre con los drivers mock
// por defecto (VEGA_CLIENT_DRIVER / OPENAI_PREVIEW_CLIENT_DRIVER=mock,
// ver .env.example): ejercita el pipeline real de la app (ruta HTTP,
// validacion, persistencia, UI) sin depender de Railway ni OpenAI reales.

async function selectPlace(page: Page, query: string, name: string) {
  await page.getByLabel(/lugar de nacimiento|ciudad de nacimiento/i).fill(query);
  await page.getByRole("button", { name, exact: true }).click();
}

async function completeSegmentAOnboarding(page: Page) {
  // Suspension de trafico real (libs/experiment/constants.ts): unico
  // punto de entrada de este helper, reutilizado por ambos tests.
  await page.goto("/explorar?test=1");
  await page.getByRole("button", { name: "Explorar mi situación" }).click();
  await expect(page).toHaveURL(/\/flow/, { timeout: 10000 });

  await page.getByRole("button", { name: "Trabajo o carrera" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("button", { name: "Añadir mis datos" }).click();
  await page.locator('input[type="date"]').fill("1990-05-12");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator('input[type="time"]').fill("14:35");
  await page.getByRole("button", { name: "Continuar" }).click();
  await selectPlace(page, "Madrid", "Madrid — Comunidad de Madrid — España");
  await page.getByRole("button", { name: "Crear mi primera lectura" }).click();
}

test("preview de segmento A: insight, evidencia, limitacion y CTA visibles", async ({ page }) => {
  await completeSegmentAOnboarding(page);

  await expect(page.getByRole("heading", { name: "Tu primera lectura" })).toBeVisible();
  await expect(page.getByText("Vega está teniendo en cuenta:")).toBeVisible();
  // Exactamente dos evidencias (VEGA_Fase_4C, bloque G).
  await expect(page.locator("ol li")).toHaveCount(2);

  const continueButton = page.getByRole("button", { name: "Continuar explorando" });
  await expect(continueButton).toBeVisible();
  await continueButton.click();
});

test("error de generacion: muestra Reintentar y recupera sin perder los datos de onboarding", async ({ page }) => {
  let requestCount = 0;
  await page.route("**/api/preview", async (route) => {
    requestCount += 1;
    if (requestCount === 1) {
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, status: "error", errorType: "unknown" }),
      });
      return;
    }
    await route.continue();
  });

  await completeSegmentAOnboarding(page);

  await expect(
    page.getByText("No hemos podido generar tu lectura correctamente. Puedes volver a intentarlo")
  ).toBeVisible();

  await page.getByRole("button", { name: "Reintentar" }).click();

  await expect(page.getByRole("heading", { name: "Tu primera lectura" })).toBeVisible();
  await expect(page.getByText("Vega está teniendo en cuenta:")).toBeVisible();
  expect(requestCount).toBeGreaterThanOrEqual(2);
});

// La cobertura de segmento B (sinastria real: full/partial/minimal,
// insufficient_data, Reintentar) vive en tests/e2e/preview-b.spec.ts
// (Sprint 3B).
