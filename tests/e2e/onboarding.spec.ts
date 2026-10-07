import { expect, test, type Page } from "@playwright/test";

// Journeys completos de onboarding (Sprint 2, seccion "Tests obligatorios"):
// A full, A sin hora, B full, B partial, B minimal. Cada uno recorre la UI
// real de principio a fin y confirma tanto la navegacion como la
// respuesta real de la API (precision devuelta por el servidor, nunca
// decidida por el navegador).

// name debe ser la etiqueta EXACTA y completa del resultado (con
// exact:true) porque el dataset real de GeoNames incluye muchas
// localidades compuestas (ej. "Las Rozas de Madrid") cuya etiqueta
// contiene la de la ciudad buscada como substring: una coincidencia
// parcial seria ambigua.
async function selectPlace(page: Page, query: string, name: string) {
  await page.getByLabel(/lugar de nacimiento|ciudad de nacimiento/i).fill(query);
  await page.getByRole("button", { name, exact: true }).click();
}

test("Journey A full: trigger -> texto -> fecha -> hora -> lugar -> onboarding completo", async ({ page }) => {
  // Suspension de trafico real (libs/experiment/constants.ts): se marca
  // como trafico de test en el unico punto de entrada del recorrido; la
  // cookie vega_test persiste para el resto del test.
  await page.goto("/explorar?test=1");
  await page.getByRole("button", { name: "Explorar mi situación" }).click();
  await expect(page).toHaveURL(/\/flow/, { timeout: 10000 });

  await page.getByRole("button", { name: "Trabajo o carrera" }).click();
  await page.getByRole("textbox").fill("Un poco de contexto de prueba");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: "Ahora podemos personalizarlo" })).toBeVisible();
  await page.getByRole("button", { name: "Añadir mis datos" }).click();

  await expect(page.getByRole("heading", { name: "¿Cuál es tu fecha de nacimiento?" })).toBeVisible();
  await page.locator('input[type="date"]').fill("1990-05-12");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: "¿A qué hora naciste?" })).toBeVisible();
  await page.locator('input[type="time"]').fill("14:35");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: "¿Dónde naciste?" })).toBeVisible();
  await selectPlace(page, "Madrid", "Madrid — Comunidad de Madrid — España");

  const [ownProfileResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/own-profile")),
    page.getByRole("button", { name: "Crear mi primera lectura" }).click(),
  ]);
  const ownProfileBody = await ownProfileResponse.json();
  expect(ownProfileBody.precision).toBe("full");
  expect(ownProfileBody.nextStep).toBe("preview");

  // Sprint 3A: segmento A pasa automaticamente a generar y mostrar la
  // preview (Vega + OpenAI mockeados por defecto, VEGA_CLIENT_DRIVER /
  // OPENAI_PREVIEW_CLIENT_DRIVER=mock).
  await expect(page.getByRole("heading", { name: "Tu primera lectura" })).toBeVisible();
  await expect(page.getByText("Vega está teniendo en cuenta:")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar explorando" })).toBeVisible();
});

test("Journey A sin hora: 'No conozco mi hora' -> precision limited, nunca inventa una hora", async ({
  page,
}) => {
  // Suspension de trafico real (libs/experiment/constants.ts): se marca
  // como trafico de test en el unico punto de entrada del recorrido; la
  // cookie vega_test persiste para el resto del test.
  await page.goto("/explorar?test=1");
  await page.getByRole("button", { name: "Explorar mi situación" }).click();
  await expect(page).toHaveURL(/\/flow/, { timeout: 10000 });

  await page.getByRole("button", { name: "Identidad / quién soy" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("button", { name: "Añadir mis datos" }).click();
  await page.locator('input[type="date"]').fill("1985-11-03");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: "¿A qué hora naciste?" })).toBeVisible();
  await page.getByRole("button", { name: "No conozco mi hora" }).click();

  await selectPlace(page, "Barcelona", "Barcelona — Cataluña — España");

  const [ownProfileResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/own-profile")),
    page.getByRole("button", { name: "Crear mi primera lectura" }).click(),
  ]);
  const ownProfileBody = await ownProfileResponse.json();
  expect(ownProfileBody.precision).toBe("limited");

  // Sprint 3A: preview generada igualmente sin hora conocida (Vega mock
  // devuelve time_known=false, la preview nunca menciona casas/Ascendente).
  await expect(page.getByRole("heading", { name: "Tu primera lectura" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar explorando" })).toBeVisible();
});

test("Journey B full: perfil propio + partner con fecha, hora y lugar -> partnerPrecision full", async ({
  page,
}) => {
  // Suspension de trafico real (libs/experiment/constants.ts): se marca
  // como trafico de test en el unico punto de entrada del recorrido; la
  // cookie vega_test persiste para el resto del test.
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

  await page.locator('input[type="date"]').fill("1988-03-02");
  await page.getByRole("checkbox", { name: "Conozco su hora de nacimiento" }).check();
  await page.locator('input[type="time"]').fill("09:15");
  await selectPlace(page, "Valencia", "Valencia — Comunidad Valenciana — España");

  const [partnerResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/partner")),
    page.getByRole("button", { name: "Continuar" }).click(),
  ]);
  const partnerBody = await partnerResponse.json();
  expect(partnerBody.partnerPrecision).toBe("full");
  expect(partnerBody.analysisPossible).toBe(true);

  // Sprint 3B: full/full pasa automaticamente a generar y mostrar la
  // preview relacional (Vega synastry + OpenAI mockeados por defecto).
  await expect(page.getByRole("heading", { name: "Tu primera lectura" })).toBeVisible();
  await expect(page.getByText("Vega está teniendo en cuenta:")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar explorando" })).toBeVisible();
});

test("Journey B partial: partner con fecha y lugar sin hora -> partnerPrecision partial", async ({ page }) => {
  // Suspension de trafico real (libs/experiment/constants.ts): se marca
  // como trafico de test en el unico punto de entrada del recorrido; la
  // cookie vega_test persiste para el resto del test.
  await page.goto("/explorar?test=1");
  await page.getByRole("button", { name: "Explorar esta relación" }).click();
  await expect(page).toHaveURL(/\/flow/, { timeout: 10000 });

  await page.getByRole("button", { name: "Conflicto" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Añadir mis datos" }).click();
  await page.locator('input[type="date"]').fill("1990-05-12");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "No conozco mi hora" }).click();
  await selectPlace(page, "Madrid", "Madrid — Comunidad de Madrid — España");
  await page.getByRole("button", { name: "Crear mi primera lectura" }).click();

  await page.getByRole("button", { name: "Añadir los datos que conozco" }).click();
  await page.locator('input[type="date"]').fill("1988-03-02");
  await selectPlace(page, "Sevilla", "Sevilla — Andalucía — España");

  const [partnerResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/partner")),
    page.getByRole("button", { name: "Continuar" }).click(),
  ]);
  const partnerBody = await partnerResponse.json();
  expect(partnerBody.partnerPrecision).toBe("partial");

  // Sprint 3B: partial/partial sigue teniendo aspectos robustos
  // suficientes en el mock (sin ASC/MC, sin orbe/fuerza/exacto).
  await expect(page.getByRole("heading", { name: "Tu primera lectura" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar explorando" })).toBeVisible();
});

test("Journey B minimal: partner solo con fecha -> partnerPrecision minimal", async ({ page }) => {
  // Suspension de trafico real (libs/experiment/constants.ts): se marca
  // como trafico de test en el unico punto de entrada del recorrido; la
  // cookie vega_test persiste para el resto del test.
  await page.goto("/explorar?test=1");
  await page.getByRole("button", { name: "Explorar esta relación" }).click();
  await expect(page).toHaveURL(/\/flow/, { timeout: 10000 });

  await page.getByRole("button", { name: "Es mi ex" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Añadir mis datos" }).click();
  await page.locator('input[type="date"]').fill("1990-05-12");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "No conozco mi hora" }).click();
  await selectPlace(page, "Madrid", "Madrid — Comunidad de Madrid — España");
  await page.getByRole("button", { name: "Crear mi primera lectura" }).click();

  await page.getByRole("button", { name: "Añadir los datos que conozco" }).click();
  await page.locator('input[type="date"]').fill("1988-03-02");

  const [partnerResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/partner")),
    page.getByRole("button", { name: "Continuar" }).click(),
  ]);
  const partnerBody = await partnerResponse.json();
  expect(partnerBody.partnerPrecision).toBe("minimal");

  // Sprint 3B: "minimal" (solo fecha, sin lugar) siempre resuelve en
  // insufficient_data -- Vega nunca calcula una sinastria sin timezone/
  // coordenadas, y Next.js nunca improvisa una preview con las dos
  // cartas natales por separado.
  await expect(page.getByRole("heading", { name: "Necesitamos algo más de información" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Volver y añadir más información" })).toBeVisible();
});
