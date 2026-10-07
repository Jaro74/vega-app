import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // "server-only" solo funciona vía el alias que aplica el bundler
      // de Next.js en build; fuera de Next (aquí, en Vitest) lanza
      // siempre. Se sustituye por un stub solo para tests (no cambia el
      // comportamiento real de la app).
      "server-only": `${import.meta.dirname}/tests/stubs/server-only.ts`,
      "@": import.meta.dirname,
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    env: {
      // .env.local no se carga automaticamente aqui (a diferencia de
      // Next.js): los drivers (EXPERIMENT_DB_DRIVER, etc.) funcionan sin
      // el porque tienen un valor por defecto seguro si faltan. Este
      // secreto no tiene ese fallback a proposito (falla alto y claro si
      // falta, ver libs/experiment/session-credential.ts), asi que los
      // tests de integracion que pasan por GET /api/session o
      // POST /api/segment lo necesitan configurado explicitamente aqui.
      EXPERIMENT_SESSION_SECRET: "test-secret-solo-para-vitest",
    },
  },
});
