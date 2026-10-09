import { expect, test } from "@playwright/test";

// Consentimiento especifico del texto libre de problem_context (art.
// 6.1.a / 9.2.a cuando proceda, ver documentacion/VEGA_Consentimiento_FreeText_v1.md).
// Serial: estos tests comparten el mismo patron de navegacion real
// (page.goto + flujo completo) que ya mostro, en datos-de-terceros.spec.ts,
// sensibilidad a timeouts de red intermitentes bajo 2 workers en este
// entorno concreto -- serializar evita ese artefacto sin debilitar
// ninguna aseveracion.
test.describe.configure({ mode: "serial" });

test("el texto libre opcional bloquea Continuar hasta marcar el consentimiento, y se libera si se borra el texto", async ({
  page,
}) => {
  await page.goto("/explorar?test=1");
  await page.getByRole("button", { name: "Explorar mi situación" }).click();
  await expect(page).toHaveURL(/\/flow/, { timeout: 10000 });

  await page.getByRole("button", { name: "Trabajo o carrera" }).click();

  const continueButton = page.getByRole("button", { name: "Continuar" });
  const textarea = page.getByRole("textbox");
  const checkbox = page.getByRole("checkbox", { name: /Doy mi consentimiento/ });

  // Sin texto: el checkbox no existe y Continuar esta habilitado.
  await expect(checkbox).toHaveCount(0);
  await expect(continueButton).toBeEnabled();

  await textarea.fill("Un poco de contexto de prueba");
  await expect(checkbox).toBeVisible();
  await expect(checkbox).not.toBeChecked();
  await expect(continueButton).toBeDisabled();

  await checkbox.check();
  await expect(continueButton).toBeEnabled();

  // Si se borra el texto tras marcar, el consentimiento ya no es
  // necesario -- el checkbox desaparece y no queda implicitamente
  // "concedido" para un texto futuro distinto.
  await textarea.fill("");
  await expect(checkbox).toHaveCount(0);
  await expect(continueButton).toBeEnabled();
});

test("el filtro de cliente rechaza, con el mismo mensaje aprobado, sin llegar a llamar a /api/problem", async ({
  page,
}) => {
  await page.goto("/explorar?test=1");
  await page.getByRole("button", { name: "Explorar mi situación" }).click();
  await expect(page).toHaveURL(/\/flow/, { timeout: 10000 });

  const problemRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/problem")) problemRequests.push(request.url());
  });

  await page.getByRole("button", { name: "Trabajo o carrera" }).click();
  await page.getByRole("textbox").fill("Puedes escribirme a persona.ejemplo@correo.com si quieres");
  await page.getByRole("checkbox", { name: /Doy mi consentimiento/ }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByText(/Parece que este texto incluye un dato de contacto o un documento de identidad/)).toBeVisible();
  // Nunca avanza de pantalla.
  await expect(page.getByRole("button", { name: "Trabajo o carrera" })).toHaveCount(0);
  await expect(page.getByRole("textbox")).toBeVisible();

  // El filtro de cliente (mismo modulo que el servidor) bloqueo antes
  // de llamar a la red -- /api/problem nunca llego a invocarse para
  // este envio. El checkbox sigue marcado: el rechazo no toca el
  // consentimiento ya registrado localmente.
  expect(problemRequests).toHaveLength(0);
  await expect(page.getByRole("checkbox", { name: /Doy mi consentimiento/ })).toBeChecked();
});

test("el filtro servidor sigue siendo la barrera real: un texto que pasa el cliente pero no el servidor sigue bloqueado por /api/problem", async ({
  page,
}) => {
  // Regresion: si algun dia el modulo de cliente y servidor divergieran,
  // este test seguiria exigiendo que el servidor rechace por su cuenta
  // -- hoy, al compartir exactamente el mismo modulo, el cliente ya
  // bloquea antes; por eso esta llamada directa a fetch (sin pasar por
  // la UI) es la unica forma de ejercitar la ruta sin el filtro de
  // cliente de por medio.
  await page.goto("/explorar?test=1");
  await page.getByRole("button", { name: "Explorar mi situación" }).click();
  await expect(page).toHaveURL(/\/flow/, { timeout: 10000 });

  const flowAttemptId = await page.evaluate(async () => {
    const response = await fetch("/api/session");
    const body = await response.json();
    return body.flowAttemptId as string;
  });

  const response = await page.evaluate(async (id) => {
    const res = await fetch("/api/problem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flowAttemptId: id,
        trigger: "career",
        freeText: "Puedes escribirme a persona.ejemplo@correo.com si quieres",
        freeTextConsentGiven: true,
        freeTextConsentVersion: "v1",
      }),
    });
    return { status: res.status, body: await res.json() };
  }, flowAttemptId);

  expect(response.status).toBe(400);
  expect(response.body.error).toContain("dato de contacto o un documento de identidad");
});

test("/mis-datos permite retirar el consentimiento de un texto ya enviado", async ({ page }) => {
  await page.goto("/explorar?test=1");
  await page.getByRole("button", { name: "Explorar mi situación" }).click();
  await expect(page).toHaveURL(/\/flow/, { timeout: 10000 });

  await page.getByRole("button", { name: "Trabajo o carrera" }).click();
  await page.getByRole("textbox").fill("Un texto que luego voy a retirar");
  await page.getByRole("checkbox", { name: /Doy mi consentimiento/ }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Ahora podemos personalizarlo" })).toBeVisible();

  await page.goto("/mis-datos?test=1");
  const withdrawButton = page.getByRole("button", { name: "Retirar el consentimiento de este texto" });
  await expect(withdrawButton).toBeVisible();
  await withdrawButton.click();
  await page
    .getByRole("button", { name: "Sí, retirar el consentimiento de este texto" })
    .click();

  await expect(withdrawButton).toHaveCount(0);
});
