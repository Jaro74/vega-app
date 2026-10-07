import { expect, test } from "@playwright/test";

// Router + resumption tras refresh (Sprint 1 seccion 19 + Sprint 2
// seccion "Recuperacion de estado"). El estado autoritativo (segmento,
// flow_attempt_id, is_primary_attempt, ultimo paso confirmado) se
// verifica contra GET /api/session, igual que ya hace
// tests/e2e/tester-traffic.spec.ts, en vez de raspar texto de la UI:
// mas robusto frente a cambios de copy y es la misma fuente de verdad
// que usa el frontend para decidir donde reanudar.

async function readSession(page: import("@playwright/test").Page) {
  const response = await page.request.get("/api/session");
  return response.json() as Promise<{
    flowAttemptId: string | null;
    isPrimaryAttempt: boolean | null;
    segment: string | null;
    lastCompletedStep: string | null;
  }>;
}

test("la landing enlaza al router del experimento", async ({ page }) => {
  // Suspension de trafico real (libs/experiment/constants.ts): se marca
  // como trafico de test desde la landing, antes de seguir el enlace.
  await page.goto("/?test=1");
  await page.getByRole("link", { name: /ir al experimento vega/i }).click();
  await expect(page).toHaveURL(/\/explorar/);
  await expect(page.getByRole("heading", { name: "¿Qué quieres comprender mejor ahora?" })).toBeVisible();
});

test("E2E1: router -> A -> refresh antes de completar problem sigue mostrando el mismo paso", async ({
  page,
}) => {
  await page.goto("/explorar?test=1");
  await page.getByRole("button", { name: "Explorar mi situación" }).click();
  await expect(page).toHaveURL(/\/flow/, { timeout: 10000 });
  await expect(page.getByRole("heading", { name: "¿Qué quieres comprender mejor?" })).toBeVisible();

  const before = await readSession(page);
  expect(before.segment).toBe("A");
  expect(before.lastCompletedStep).toBeNull();

  await page.reload();

  await expect(page.getByRole("heading", { name: "¿Qué quieres comprender mejor?" })).toBeVisible();
  const after = await readSession(page);
  expect(after.flowAttemptId).toBe(before.flowAttemptId);
  expect(after.isPrimaryAttempt).toBe(true);
});

test("E2E2: router -> A -> completar problem -> refresh reanuda en own_profile_intro", async ({ page }) => {
  await page.goto("/explorar?test=1");
  await page.getByRole("button", { name: "Explorar mi situación" }).click();
  await expect(page).toHaveURL(/\/flow/, { timeout: 10000 });

  await page.getByRole("button", { name: "Trabajo o carrera" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Ahora podemos personalizarlo" })).toBeVisible();

  const beforeReload = await readSession(page);
  expect(beforeReload.lastCompletedStep).toBe("problem_text");

  await page.reload();

  await expect(page.getByRole("heading", { name: "Ahora podemos personalizarlo" })).toBeVisible();
  const afterReload = await readSession(page);
  expect(afterReload.flowAttemptId).toBe(beforeReload.flowAttemptId);
  expect(afterReload.lastCompletedStep).toBe("problem_text");
});

test("cambiar de segmento desde /flow crea un nuevo intento (secondary) sin perder el primario", async ({
  page,
}) => {
  await page.goto("/explorar?test=1");
  await page.getByRole("button", { name: "Explorar mi situación" }).click();
  await expect(page).toHaveURL(/\/flow/, { timeout: 10000 });

  const primary = await readSession(page);
  expect(primary.isPrimaryAttempt).toBe(true);

  await page.getByRole("link", { name: "Cambiar de segmento" }).click();
  await expect(page).toHaveURL(/\/explorar/);
  await expect(page.getByText(/Ya has empezado esta experiencia/)).toBeVisible();

  await page.getByRole("button", { name: "Explorar esta relación" }).click();
  await expect(page).toHaveURL(/\/flow/, { timeout: 10000 });
  await expect(page.getByRole("heading", { name: "¿Qué quieres comprender mejor de esta relación?" })).toBeVisible();

  const secondary = await readSession(page);
  expect(secondary.flowAttemptId).not.toBe(primary.flowAttemptId);
  expect(secondary.isPrimaryAttempt).toBe(false);
  expect(secondary.segment).toBe("B");
});
