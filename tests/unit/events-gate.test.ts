import { beforeEach, describe, expect, it, vi } from "vitest";

// Prueba de integracion del gate: captureExperimentEvent() debe retener
// el envio real a PostHog hasta que el gate (libs/analytics/experiment-ready.ts)
// se resuelva, y nunca enviar nada si se resuelve en "blocked". No se
// cambia nada de assertNoForbiddenProperties() (ya cubierto por
// tests/unit/analytics-privacy.test.ts); aqui solo se verifica que el
// envio real a PostHog -- no solo la promesa interna -- respeta el gate,
// y que el nombre/propiedades del evento llegan intactos cuando si se
// envia.
//
// captureMock/identifyMock/initPostHogMock se declaran con vi.hoisted
// porque vi.mock(...) se hoistea por encima de los imports (mismo motivo
// que tests/unit/openai-http-client.test.ts): sin esto, la factory no
// podria referenciar una variable del cuerpo del test.
const { captureMock, identifyMock, initPostHogMock } = vi.hoisted(() => ({
  captureMock: vi.fn(),
  identifyMock: vi.fn(),
  initPostHogMock: vi.fn(),
}));

vi.mock("@/libs/analytics/posthog-client", () => ({
  initPostHog: initPostHogMock,
}));

import { captureExperimentEvent, type Sprint1EventProperties } from "@/libs/analytics/events";
import {
  markExperimentReady,
  resetExperimentReadyForTests,
} from "@/libs/analytics/experiment-ready";

const baseProperties: Sprint1EventProperties = {
  anonymousUserId: "11111111-1111-1111-1111-111111111111",
  sessionId: "session-1",
  segment: "A",
  isPrimaryAttempt: true,
  isTest: false,
  trafficSource: "direct",
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmContent: null,
  placement: null,
  deviceType: "desktop",
};

describe("captureExperimentEvent - gate de ready/blocked", () => {
  beforeEach(() => {
    resetExperimentReadyForTests();
    captureMock.mockClear();
    identifyMock.mockClear();
    initPostHogMock.mockClear();
    initPostHogMock.mockReturnValue({ capture: captureMock, identify: identifyMock });
  });

  it("ningun capture() mientras el gate sigue pending", async () => {
    captureExperimentEvent("neutral_landing_view", baseProperties);
    await Promise.resolve();
    await Promise.resolve();

    expect(captureMock).not.toHaveBeenCalled();
  });

  it("evento encolado antes de que el bootstrap termine + bootstrap correcto: se envia con el nombre y las propiedades originales", async () => {
    captureExperimentEvent("neutral_landing_view", baseProperties);

    markExperimentReady(true);
    await flushMicrotasks();

    expect(captureMock).toHaveBeenCalledTimes(1);
    expect(captureMock).toHaveBeenCalledWith("neutral_landing_view", {
      experimentId: expect.any(String),
      ...baseProperties,
    });
  });

  it("bootstrap correcto antes de que llegue el evento: tambien se envia", async () => {
    markExperimentReady(true);

    captureExperimentEvent("router_view", baseProperties);
    await flushMicrotasks();

    expect(captureMock).toHaveBeenCalledTimes(1);
    expect(captureMock).toHaveBeenCalledWith("router_view", expect.objectContaining(baseProperties));
  });

  it("bootstrap fallido/bloqueado: el evento se descarta, nunca llega a capture()", async () => {
    captureExperimentEvent("neutral_landing_view", baseProperties);

    markExperimentReady(false);
    await flushMicrotasks();

    expect(captureMock).not.toHaveBeenCalled();
  });

  it("ningun capture() cuando el gate queda blocked, incluso si initPostHog() seguiria devolviendo una instancia valida", async () => {
    markExperimentReady(false);

    captureExperimentEvent("segment_selected", baseProperties);
    await flushMicrotasks();

    expect(captureMock).not.toHaveBeenCalled();
    // El gate corta antes de siquiera llamar a initPostHog() para este
    // evento -- no hace falta volver a inicializar PostHog para un
    // evento que se va a descartar.
    expect(initPostHogMock).not.toHaveBeenCalled();
  });

  it("varios eventos pendientes se liberan todos cuando el bootstrap termina en ready", async () => {
    captureExperimentEvent("neutral_landing_view", baseProperties);
    captureExperimentEvent("router_view", baseProperties);
    captureExperimentEvent("segment_selected", baseProperties);

    markExperimentReady(true);
    await flushMicrotasks();

    expect(captureMock).toHaveBeenCalledTimes(3);
    expect(captureMock.mock.calls.map((call) => call[0])).toEqual([
      "neutral_landing_view",
      "router_view",
      "segment_selected",
    ]);
  });

  it("identify() ocurre antes del primer capture(): simula el orden real ExperimentBootstrap -> captureExperimentEvent", async () => {
    captureExperimentEvent("neutral_landing_view", baseProperties);

    // Simula lo que hace bootstrapExperiment(): llama a identify() y
    // SOLO DESPUES marca el gate como ready.
    const posthog = initPostHogMock();
    posthog.identify(baseProperties.anonymousUserId);
    markExperimentReady(true);

    await flushMicrotasks();

    expect(captureMock).toHaveBeenCalledTimes(1);
    const identifyOrder = identifyMock.mock.invocationCallOrder[0];
    const captureOrder = captureMock.mock.invocationCallOrder[0];
    expect(identifyOrder).toBeLessThan(captureOrder);
  });
});

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
