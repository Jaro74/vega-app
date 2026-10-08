import { expect, test } from "@playwright/test";

// Pagina publica para la "segunda persona" del Segmento B
// (VEGA_Analisis_Art14_Segmento_B_v1.md, bloque 8): sin sesion, sin
// formulario de identificacion previo. Este archivo verifica que el
// contenido esta disponible y que, mientras no exista la sociedad
// responsable, nunca aparenta tener ya un canal de contacto real
// operativo (regresion explicita contra mostrar un email ficticio).
//
// Serial, no paralelo: dos workers navegando a la vez con page.goto
// directo a esta misma ruta nueva disparan, en este entorno, timeouts
// de red intermitentes ajenos a la app (confirmado: curl concurrente
// contra el servidor de produccion ya construido responde en <200ms
// para ambas peticiones simultaneas; el build genera la ruta como
// estatica igual que /privacy-policy y /tos). Serializar evita ese
// artefacto del entorno de test sin debilitar ninguna asercion.
test.describe.configure({ mode: "serial" });

test("pagina publica /datos-de-terceros carga sin sesion y explica el tratamiento", async ({ page }) => {
  await page.goto("/datos-de-terceros");

  await expect(page.getByRole("heading", { name: "¿Crees que alguien ha usado tus datos en Vega?" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Base jurídica" })).toBeVisible();
  await expect(page.getByText(/Agencia Española de Protección de Datos/)).toBeVisible();
  await expect(page.getByText(/art\. 14\.5\.b RGPD/).first()).toBeVisible();
});

test("/datos-de-terceros no muestra ningun email ficticio y deja claro que el canal todavia no existe", async ({
  page,
}) => {
  await page.goto("/datos-de-terceros");

  // Mensaje exacto aprobado para la seccion de contacto mientras no
  // exista la sociedad responsable.
  await expect(
    page.getByText(
      "Vega todavía no está abierto a tráfico real. Antes de la apertura se habilitará aquí el canal específico de privacidad de la sociedad responsable para ejercer tus derechos o plantear consultas sobre datos de terceras personas."
    )
  ).toBeVisible();

  // La medida del art. 14.5.b no se presenta como ya plenamente operativa.
  await expect(
    page.getByText(/la medida prevista conforme al art\. 14\.5\.b RGPD no se considera todavía plenamente operativa/)
  ).toBeVisible();

  // Regresion: ningun email con apariencia real (ni siquiera un
  // placeholder entre corchetes) debe aparecer en esta pagina.
  const bodyText = await page.locator("body").innerText();
  expect(bodyText).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.-]+/);
});

test("el footer y la politica de privacidad enlazan a /datos-de-terceros", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "¿Han usado tus datos?" }).click();
  await expect(page).toHaveURL(/\/datos-de-terceros$/);

  await page.goto("/privacy-policy");
  await page.getByRole("link", { name: "¿Crees que alguien ha usado tus datos en Vega?" }).click();
  await expect(page).toHaveURL(/\/datos-de-terceros$/);
});
