import { expect, test, type Page } from "@playwright/test";

// Journeys de Sprint 3B (preview segmento B, sinastria real). Corre con
// los drivers mock por defecto (VEGA_CLIENT_DRIVER / OPENAI_PREVIEW_CLIENT_DRIVER
// = mock, ver .env.example): ejercita el pipeline real de la app (ruta
// HTTP, validacion, persistencia, UI) sin depender de Railway ni OpenAI
// reales.

async function selectPlace(page: Page, query: string, name: string) {
  await page.getByLabel(/lugar de nacimiento|ciudad de nacimiento/i).fill(query);
  await page.getByRole("button", { name, exact: true }).click();
}

async function startSegmentBUpToPartnerIntro(page: Page) {
  // Suspension de trafico real (libs/experiment/constants.ts): unico
  // punto de entrada de este helper, reutilizado por los 4 tests.
  await page.goto("/explorar?test=1");
  await page.getByRole("button", { name: "Explorar esta relación" }).click();
  await expect(page).toHaveURL(/\/flow/, { timeout: 10000 });

  await page.getByRole("button", { name: "Estamos en una relación" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("button", { name: "Añadir mis datos" }).click();
  await page.locator('input[type="date"]').fill("1990-05-12");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator('input[type="time"]').fill("14:35");
  await page.getByRole("button", { name: "Continuar" }).click();
  await selectPlace(page, "Madrid", "Madrid — Comunidad de Madrid — España");
  await page.getByRole("button", { name: "Crear mi primera lectura" }).click();

  await expect(page.getByRole("heading", { name: "Podemos añadir los datos de la otra persona" })).toBeVisible();
  await page.getByRole("button", { name: "Añadir los datos que conozco" }).click();
}

test("preview de segmento B (full): insight, evidencia relacional y CTA visibles", async ({ page }) => {
  await startSegmentBUpToPartnerIntro(page);

  await page.locator('input[type="date"]').fill("1988-03-02");
  await page.getByRole("checkbox", { name: "Conozco su hora de nacimiento" }).check();
  await page.locator('input[type="time"]').fill("09:15");
  await selectPlace(page, "Valencia", "Valencia — Comunidad Valenciana — España");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: "Tu primera lectura" })).toBeVisible();
  await expect(page.getByText("Vega está teniendo en cuenta:")).toBeVisible();
  await expect(page.locator("ol li")).toHaveCount(2);

  const continueButton = page.getByRole("button", { name: "Continuar explorando" });
  await expect(continueButton).toBeVisible();
  await continueButton.click();
});

test("preview de segmento B (partial): sin hora de la otra persona, preview igualmente visible", async ({ page }) => {
  await startSegmentBUpToPartnerIntro(page);

  await page.locator('input[type="date"]').fill("1988-03-02");
  await selectPlace(page, "Valencia", "Valencia — Comunidad Valenciana — España");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: "Tu primera lectura" })).toBeVisible();
  await expect(page.locator("ol li")).toHaveCount(2);
});

test("segmento B minimal: mensaje de datos insuficientes, permite volver a añadir el lugar y completar la lectura", async ({
  page,
}) => {
  await startSegmentBUpToPartnerIntro(page);

  // Solo fecha, sin lugar: Vega nunca puede calcular una sinastria sin
  // timezone/coordenadas (precision "minimal").
  await page.locator('input[type="date"]').fill("1988-03-02");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: "Necesitamos algo más de información" })).toBeVisible();
  const editButton = page.getByRole("button", { name: "Volver y añadir más información" });
  await expect(editButton).toBeVisible();
  await editButton.click();

  // Vuelve a PartnerStep (sin perder el contexto del problema ya
  // enviado), que se remonta en su sub-paso "intro"; hay que volver a
  // entrar al formulario para completar el lugar que faltaba.
  await expect(page.getByRole("heading", { name: "Podemos añadir los datos de la otra persona" })).toBeVisible();
  await page.getByRole("button", { name: "Añadir los datos que conozco" }).click();

  await expect(page.getByRole("heading", { name: "Datos de la otra persona" })).toBeVisible();
  await page.locator('input[type="date"]').fill("1988-03-02");
  await selectPlace(page, "Valencia", "Valencia — Comunidad Valenciana — España");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: "Tu primera lectura" })).toBeVisible();
});

test("error de generacion en segmento B: muestra Reintentar y recupera sin perder los datos de onboarding", async ({
  page,
}) => {
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

  await startSegmentBUpToPartnerIntro(page);

  await page.locator('input[type="date"]').fill("1988-03-02");
  await page.getByRole("checkbox", { name: "Conozco su hora de nacimiento" }).check();
  await page.locator('input[type="time"]').fill("09:15");
  await selectPlace(page, "Valencia", "Valencia — Comunidad Valenciana — España");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(
    page.getByText("No hemos podido generar tu lectura correctamente. Puedes volver a intentarlo")
  ).toBeVisible();

  await page.getByRole("button", { name: "Reintentar" }).click();

  await expect(page.getByRole("heading", { name: "Tu primera lectura" })).toBeVisible();
  expect(requestCount).toBeGreaterThanOrEqual(2);
});
