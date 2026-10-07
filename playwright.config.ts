import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  // 10s en vez del default de 5s: este sandbox corre Chromium + el
  // servidor Next + otros procesos a la vez, y bajo 2 workers en
  // paralelo alguna asercion justo despues de un reload puede tardar
  // mas de 5s sin que haya ningun problema real de la app.
  expect: {
    timeout: 10 * 1000,
  },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Build de produccion en vez de "next dev": en dev, Next.js compila
    // cada ruta bajo demanda en el primer hit, lo que puede superar los
    // timeouts por defecto de Playwright en los primeros tests de la
    // suite (falso negativo, no un bug de la app). Con build+start todas
    // las rutas ya estan compiladas antes de que arranque ningun test.
    command: "npm run build && npm run start",
    // NEXT_PUBLIC_E2E_POSTHOG_BYPASS_ENABLED (libs/analytics/posthog-client.ts):
    // capa 1 del bypass exclusivo de tests/e2e/privacy.spec.ts, necesaria
    // para que ese test pueda seguir inspeccionando eventos reales de
    // PostHog mientras EXPERIMENT_ACCEPTING_REAL_TRAFFIC este en false.
    // Se inlinea en el bundle en build time, asi que solo existe en el
    // build que arranca este webServer, nunca en un build de produccion
    // real.
    env: { NEXT_PUBLIC_E2E_POSTHOG_BYPASS_ENABLED: "1" },
    url: "http://localhost:3000",
    // Deliberadamente false siempre (ya no "!process.env.CI"): reutilizar
    // un servidor local ya levantado podria ser uno construido SIN la
    // variable de arriba (p. ej. un "npm run dev" o "npm run start"
    // sueltos de otra sesion), y privacy.spec.ts fallaria de forma no
    // determinista segun que proceso encontrara el puerto 3000 ocupado.
    // Con esto, Playwright siempre arranca su propio build con la
    // configuracion exacta que esta suite necesita; si el puerto ya esta
    // en uso por otra cosa, falla alto y claro en vez de reutilizarlo en
    // silencio.
    reuseExistingServer: false,
    timeout: 180 * 1000,
  },
});
