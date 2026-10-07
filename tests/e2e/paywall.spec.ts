import { expect, test, type Page } from "@playwright/test";

// Journeys de Sprint 4 (paywall transparente + intencion de pago +
// waitlist). Corre con los drivers mock/memory por defecto: ejercita el
// pipeline real de la app (rutas HTTP, persistencia, recuperacion tras
// refresh, UI) sin depender de Railway/OpenAI/Supabase reales.

async function completeSegmentAUpToPreview(page: Page) {
  // Suspension de trafico real (libs/experiment/constants.ts): unico
  // punto de entrada de este helper, reutilizado por varios tests.
  await page.goto("/explorar?test=1");
  await page.getByRole("button", { name: "Explorar mi situación" }).click();
  await expect(page).toHaveURL(/\/flow/);

  await page.getByRole("button", { name: "Trabajo o carrera" }).click();
  await page.getByRole("textbox").fill("Un contexto de prueba");
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("button", { name: "Añadir mis datos" }).click();
  await page.locator('input[type="date"]').fill("1990-05-12");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator('input[type="time"]').fill("14:35");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Ciudad de nacimiento").fill("Madrid");
  await page.getByRole("button", { name: "Madrid — Comunidad de Madrid — España", exact: true }).click();
  await page.getByRole("button", { name: "Crear mi primera lectura" }).click();

  await expect(page.getByRole("heading", { name: "Tu primera lectura" })).toBeVisible();
}

async function completeWaitlistForm(page: Page, email: string) {
  await page.getByLabel(/Email/).fill(email);
  await page.getByRole("checkbox", { name: /Acepto que Vega guarde mi email/ }).check();
  await page.getByRole("button", { name: "Apuntarme" }).click();
}

test("journey A completo: preview -> paywall -> confirmacion -> waitlist -> beta", async ({ page }) => {
  await completeSegmentAUpToPreview(page);

  await page.getByRole("button", { name: "Continuar explorando" }).click();
  await expect(page.getByRole("heading", { name: "Continúa con Vega" })).toBeVisible();
  await expect(page.getByTestId("paywall-price")).toHaveText("9,99 €");
  await expect(
    page.getByText("Vega está actualmente en beta cerrada. Hoy no se realizará ningún cargo")
  ).toBeVisible();

  await page.getByRole("button", { name: "Quiero acceso por 9,99 €" }).click();
  await expect(page.getByRole("heading", { name: "Solicitar acceso anticipado" })).toBeVisible();

  await page.getByRole("button", { name: "Sí, quiero acceso por 9,99 € cuando esté disponible" }).click();
  await expect(page.getByRole("heading", { name: "Apúntate a la beta" })).toBeVisible();

  // El boton permanece deshabilitado hasta marcar el checkbox de
  // aceptacion explicita (encargo Sprint 4, ajuste final punto 3).
  await expect(page.getByRole("button", { name: "Apuntarme" })).toBeDisabled();

  await completeWaitlistForm(page, "usuario@example.com");
  await expect(page.getByRole("heading", { name: "¡Ya estás en la lista!" })).toBeVisible();
});

test("refresh en la pantalla de oferta del paywall no salta pasos", async ({ page }) => {
  await completeSegmentAUpToPreview(page);
  await page.getByRole("button", { name: "Continuar explorando" }).click();
  await expect(page.getByRole("heading", { name: "Continúa con Vega" })).toBeVisible();

  await page.reload();

  await expect(page.getByRole("heading", { name: "Continúa con Vega" })).toBeVisible();
});

test("refresh tras confirmar la intencion de pago recupera directamente en waitlist (no vuelve a mostrar el paywall)", async ({
  page,
}) => {
  await completeSegmentAUpToPreview(page);
  await page.getByRole("button", { name: "Continuar explorando" }).click();
  await page.getByRole("button", { name: "Quiero acceso por 9,99 €" }).click();
  await page.getByRole("button", { name: "Sí, quiero acceso por 9,99 € cuando esté disponible" }).click();
  await expect(page.getByRole("heading", { name: "Apúntate a la beta" })).toBeVisible();

  await page.reload();

  await expect(page.getByRole("heading", { name: "Apúntate a la beta" })).toBeVisible();
});

test("refresh tras enviar la waitlist muestra la pantalla final sin volver a pedir el email", async ({ page }) => {
  await completeSegmentAUpToPreview(page);
  await page.getByRole("button", { name: "Continuar explorando" }).click();
  await page.getByRole("button", { name: "Quiero acceso por 9,99 €" }).click();
  await page.getByRole("button", { name: "Sí, quiero acceso por 9,99 € cuando esté disponible" }).click();
  await completeWaitlistForm(page, "usuario@example.com");
  await expect(page.getByRole("heading", { name: "¡Ya estás en la lista!" })).toBeVisible();

  await page.reload();

  await expect(page.getByRole("heading", { name: "¡Ya estás en la lista!" })).toBeVisible();
  await expect(page.getByLabel(/Email/)).not.toBeVisible();
});

test("fallo simulado de /api/preview/complete: error recuperable, la preview sigue visible, Reintentar completa el checkpoint", async ({
  page,
}) => {
  let requestCount = 0;
  await page.route("**/api/preview/complete", async (route) => {
    requestCount += 1;
    if (requestCount === 1) {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ ok: false, error: "boom" }) });
      return;
    }
    await route.continue();
  });

  await completeSegmentAUpToPreview(page);
  await page.getByRole("button", { name: "Continuar explorando" }).click();

  await expect(page.getByText("No hemos podido continuar. Puedes volver a intentarlo.")).toBeVisible();
  // La preview generada sigue visible: no se pierde nada.
  await expect(page.getByRole("heading", { name: "Tu primera lectura" })).toBeVisible();

  await page.getByRole("button", { name: "Continuar explorando" }).click();
  await expect(page.getByRole("heading", { name: "Continúa con Vega" })).toBeVisible();
  expect(requestCount).toBeGreaterThanOrEqual(2);
});

test("dos clics sincronos en el CTA de confirmacion no producen dos peticiones de intencion de pago", async ({
  page,
}) => {
  let intentRequestCount = 0;
  await page.route("**/api/priced-intent", async (route) => {
    intentRequestCount += 1;
    await route.continue();
  });

  await completeSegmentAUpToPreview(page);
  await page.getByRole("button", { name: "Continuar explorando" }).click();
  await page.getByRole("button", { name: "Quiero acceso por 9,99 €" }).click();

  // Dos click() nativos disparados en el mismo tick de JS, antes de que
  // React tenga ocasion de re-renderizar con disabled=true: es la carrera
  // real que el guard de useRef (no useState) en PaywallStep.handleConfirm
  // debe evitar.
  const confirmButton = page.getByRole("button", { name: "Sí, quiero acceso por 9,99 € cuando esté disponible" });
  await confirmButton.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });

  await expect(page.getByRole("heading", { name: "Apúntate a la beta" })).toBeVisible();
  expect(intentRequestCount).toBe(1);
});

test("paywall nunca aparece cuando la preview es insufficient_data (segmento B minimal)", async ({ page }) => {
  await page.goto("/explorar?test=1");
  await page.getByRole("button", { name: "Explorar esta relación" }).click();
  await expect(page).toHaveURL(/\/flow/);

  await page.getByRole("button", { name: "Estamos en una relación" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("button", { name: "Añadir mis datos" }).click();
  await page.locator('input[type="date"]').fill("1990-05-12");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator('input[type="time"]').fill("14:35");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Ciudad de nacimiento").fill("Madrid");
  await page.getByRole("button", { name: "Madrid — Comunidad de Madrid — España", exact: true }).click();
  await page.getByRole("button", { name: "Crear mi primera lectura" }).click();

  await expect(page.getByRole("heading", { name: "Podemos añadir los datos de la otra persona" })).toBeVisible();
  await page.getByRole("button", { name: "Añadir los datos que conozco" }).click();

  // Solo fecha, sin lugar: precision "minimal" -> insufficient_data.
  await page.locator('input[type="date"]').fill("1988-03-02");
  await page.getByRole("checkbox", { name: /Declaro que dispongo de estos datos/ }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: "Necesitamos algo más de información" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Continúa con Vega" })).not.toBeVisible();
});
