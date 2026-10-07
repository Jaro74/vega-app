import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// initPostHog() (libs/analytics/posthog-client.ts) debe apagar PostHog por
// completo mientras EXPERIMENT_ACCEPTING_REAL_TRAFFIC este en false, salvo
// el bypass de dos capas exclusivo de tests/e2e/privacy.spec.ts. El entorno
// de Vitest es "node" (vitest.config.mts), sin DOM: se simula `window` con
// vi.stubGlobal para poder ejercitar initPostHog() igual que en un
// navegador, y se mockea posthog-js para no intentar ninguna inicializacion
// real. Cada test usa vi.doMock + import() dinamico (en vez de vi.mock
// estatico) para poder variar EXPERIMENT_ACCEPTING_REAL_TRAFFIC por test, y
// vi.resetModules() para que el `initialized` interno del modulo no se
// arrastre entre tests.

const postHogInitMock = vi.fn();
const postHogMock = { init: postHogInitMock, identify: vi.fn(), capture: vi.fn() };

vi.mock("posthog-js", () => ({ default: postHogMock }));

function stubWindowWithLocalStorage(values: Record<string, string> = {}): void {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => values[key] ?? null,
    },
  });
}

async function importInitPostHogWithFlag(flagValue: boolean) {
  vi.doMock("@/libs/experiment/constants", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/libs/experiment/constants")>();
    return { ...actual, EXPERIMENT_ACCEPTING_REAL_TRAFFIC: flagValue };
  });
  const { initPostHog } = await import("@/libs/analytics/posthog-client");
  return initPostHog;
}

describe("initPostHog - suspension de trafico real", () => {
  beforeEach(() => {
    vi.resetModules();
    postHogInitMock.mockClear();
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("con EXPERIMENT_ACCEPTING_REAL_TRAFFIC=false devuelve null y nunca llama a posthog.init", async () => {
    stubWindowWithLocalStorage();
    const initPostHog = await importInitPostHogWithFlag(false);

    expect(initPostHog()).toBeNull();
    expect(postHogInitMock).not.toHaveBeenCalled();
  });

  it("con EXPERIMENT_ACCEPTING_REAL_TRAFFIC=true inicializa con normalidad", async () => {
    stubWindowWithLocalStorage();
    const initPostHog = await importInitPostHogWithFlag(true);

    expect(initPostHog()).not.toBeNull();
    expect(postHogInitMock).toHaveBeenCalledTimes(1);
  });

  it("el bypass de privacy.spec.ts reactiva PostHog con la suspension activa SOLO si las dos capas estan presentes", async () => {
    vi.stubEnv("NEXT_PUBLIC_E2E_POSTHOG_BYPASS_ENABLED", "1");
    stubWindowWithLocalStorage({ __vega_e2e_force_posthog_enabled: "true" });
    const initPostHog = await importInitPostHogWithFlag(false);

    expect(initPostHog()).not.toBeNull();
    expect(postHogInitMock).toHaveBeenCalledTimes(1);
  });

  it("sin la variable de build time, el bypass NO se activa aunque localStorage lo pida (build de produccion real)", async () => {
    // NEXT_PUBLIC_E2E_POSTHOG_BYPASS_ENABLED deliberadamente sin definir.
    stubWindowWithLocalStorage({ __vega_e2e_force_posthog_enabled: "true" });
    const initPostHog = await importInitPostHogWithFlag(false);

    expect(initPostHog()).toBeNull();
    expect(postHogInitMock).not.toHaveBeenCalled();
  });

  it("con la variable de build time pero sin la clave de localStorage, el bypass NO se activa", async () => {
    vi.stubEnv("NEXT_PUBLIC_E2E_POSTHOG_BYPASS_ENABLED", "1");
    stubWindowWithLocalStorage();
    const initPostHog = await importInitPostHogWithFlag(false);

    expect(initPostHog()).toBeNull();
    expect(postHogInitMock).not.toHaveBeenCalled();
  });
});
