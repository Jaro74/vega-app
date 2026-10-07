import { expect, test } from "@playwright/test";

// Smoke test de Sprint 0: solo confirma que la app arranca y sirve una
// pagina. Los journeys de VEGA (A/B, preview, paywall, waitlist) llegan
// en los sprints que construyen esas pantallas.
test("la aplicacion arranca y responde en la ruta raiz", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBe(true);
  await expect(page).toHaveTitle(/.+/);
});
