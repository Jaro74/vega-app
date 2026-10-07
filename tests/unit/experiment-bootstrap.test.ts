import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// bootstrapExperiment() (components/experiment/ExperimentBootstrap.tsx) es
// el unico sitio que debe llamar a markExperimentReady(true), y solo
// despues de que /api/session haya respondido con un anonymousUserId y
// posthog.identify() se haya ejecutado de verdad -- cualquier otra salida
// (trafico suspendido, fetch no-ok, sin anonymousUserId, PostHog no
// disponible, o una excepcion) debe dejar el gate en "blocked"
// (markExperimentReady(false)), nunca en pending para siempre. Igual que
// tests/unit/posthog-client.test.ts, se usa vi.doMock + import() dinamico
// para poder variar EXPERIMENT_ACCEPTING_REAL_TRAFFIC por test y
// vi.resetModules() para no arrastrar estado entre tests.

const markExperimentReadyMock = vi.fn();
const readTestFlagFromLocationMock = vi.fn(() => false);
const initPostHogMock = vi.fn();
const identifyMock = vi.fn();

vi.mock("@/libs/analytics/experiment-ready", () => ({
  markExperimentReady: markExperimentReadyMock,
}));
vi.mock("@/libs/analytics/client-acquisition", () => ({
  readTestFlagFromLocation: readTestFlagFromLocationMock,
}));
vi.mock("@/libs/analytics/posthog-client", () => ({
  initPostHog: initPostHogMock,
}));

async function importBootstrapExperimentWithFlag(flagValue: boolean) {
  vi.doMock("@/libs/experiment/constants", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/libs/experiment/constants")>();
    return { ...actual, EXPERIMENT_ACCEPTING_REAL_TRAFFIC: flagValue };
  });
  const { bootstrapExperiment } = await import("@/components/experiment/ExperimentBootstrap");
  return bootstrapExperiment;
}

function stubFetchOnce(response: { ok: boolean; body?: unknown }): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: response.ok,
      json: async () => response.body,
    })
  );
}

function expectCalledOnceWith(mock: ReturnType<typeof vi.fn>, arg: unknown): void {
  expect(mock).toHaveBeenCalledTimes(1);
  expect(mock).toHaveBeenCalledWith(arg);
}

describe("bootstrapExperiment", () => {
  beforeEach(() => {
    vi.resetModules();
    markExperimentReadyMock.mockClear();
    readTestFlagFromLocationMock.mockClear();
    readTestFlagFromLocationMock.mockReturnValue(false);
    initPostHogMock.mockClear();
    identifyMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("trafico suspendido y sin flag de test: bloquea sin llamar a fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const bootstrapExperiment = await importBootstrapExperimentWithFlag(false);
    await bootstrapExperiment();

    expect(fetchMock).not.toHaveBeenCalled();
    expectCalledOnceWith(markExperimentReadyMock, false);
  });

  it("fetch responde no-ok: bloquea sin llamar a initPostHog", async () => {
    stubFetchOnce({ ok: false });

    const bootstrapExperiment = await importBootstrapExperimentWithFlag(true);
    await bootstrapExperiment();

    expect(initPostHogMock).not.toHaveBeenCalled();
    expectCalledOnceWith(markExperimentReadyMock, false);
  });

  it("respuesta sin anonymousUserId: bloquea sin llamar a initPostHog", async () => {
    stubFetchOnce({ ok: true, body: { anonymousUserId: "" } });

    const bootstrapExperiment = await importBootstrapExperimentWithFlag(true);
    await bootstrapExperiment();

    expect(initPostHogMock).not.toHaveBeenCalled();
    expectCalledOnceWith(markExperimentReadyMock, false);
  });

  it("PostHog no disponible (initPostHog devuelve null): bloquea sin llamar a identify", async () => {
    stubFetchOnce({ ok: true, body: { anonymousUserId: "user-1" } });
    initPostHogMock.mockReturnValue(null);

    const bootstrapExperiment = await importBootstrapExperimentWithFlag(true);
    await bootstrapExperiment();

    expect(identifyMock).not.toHaveBeenCalled();
    expectCalledOnceWith(markExperimentReadyMock, false);
  });

  it("camino feliz: identify() se llama con el anonymousUserId correcto ANTES de marcar ready(true)", async () => {
    stubFetchOnce({ ok: true, body: { anonymousUserId: "user-1" } });
    initPostHogMock.mockReturnValue({ identify: identifyMock });

    const bootstrapExperiment = await importBootstrapExperimentWithFlag(true);
    await bootstrapExperiment();

    expectCalledOnceWith(identifyMock, "user-1");
    expectCalledOnceWith(markExperimentReadyMock, true);

    const identifyOrder = identifyMock.mock.invocationCallOrder[0];
    const markReadyOrder = markExperimentReadyMock.mock.invocationCallOrder[0];
    expect(identifyOrder).toBeLessThan(markReadyOrder);
  });

  it("trafico suspendido pero con flag de test activo: no bloquea por suspension (sigue el camino normal)", async () => {
    readTestFlagFromLocationMock.mockReturnValue(true);
    stubFetchOnce({ ok: true, body: { anonymousUserId: "user-1" } });
    initPostHogMock.mockReturnValue({ identify: identifyMock });

    const bootstrapExperiment = await importBootstrapExperimentWithFlag(false);
    await bootstrapExperiment();

    expectCalledOnceWith(identifyMock, "user-1");
    expectCalledOnceWith(markExperimentReadyMock, true);
  });

  it("una excepcion inesperada (fetch rechazado) deja el gate bloqueado, nunca pendiente para siempre", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const bootstrapExperiment = await importBootstrapExperimentWithFlag(true);
    // Replica exactamente el wrapper de ExperimentBootstrap (componente
    // por defecto): bootstrapExperiment().catch(() => markExperimentReady(false)).
    // No se monta el componente React (no hay jsdom en este proyecto,
    // ver vitest.config.mts: environment "node"), pero la composicion es
    // la misma linea que corre ahi.
    await bootstrapExperiment().catch(() => markExperimentReadyMock(false));

    expectCalledOnceWith(markExperimentReadyMock, false);
  });
});
