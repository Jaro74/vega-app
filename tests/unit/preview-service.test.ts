import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryExperimentRepository } from "@/libs/db/memory-repository";
import { generatePreviewForFlowAttempt } from "@/libs/experiment/preview-service";
import type { PreviewModelClient, PreviewModelResult } from "@/libs/openai/client";
import type { VegaEvidenceClient, VegaFetchResult } from "@/libs/vega/client";
import type { VegaSynastryClient, VegaSynastryFetchResult } from "@/libs/vega/synastry-client";
import type { PreviewV1Output } from "@/types/preview";
import type { VegaNatalResponse } from "@/types/vega";

// Nunca debe llamarse desde el journey A (regression Sprint 3B: A y B
// tienen pipelines completamente separados).
class UnusedSynastryClient implements VegaSynastryClient {
  async fetchSynastryEvidence(): Promise<VegaSynastryFetchResult> {
    throw new Error("no deberia llamarse desde el journey de segmento A");
  }
}

const MADRID_PLACE = {
  placeLabel: "Madrid",
  countryCode: "ES",
  latitude: 40.4168,
  longitude: -3.7038,
  timezoneId: "Europe/Madrid",
};

class FakeVegaClient implements VegaEvidenceClient {
  callCount = 0;
  constructor(private readonly result: VegaFetchResult) {}
  async fetchNatalEvidence(): Promise<VegaFetchResult> {
    this.callCount += 1;
    return this.result;
  }
}

class FakeOpenAIClient implements PreviewModelClient {
  callCount = 0;
  constructor(private readonly result: PreviewModelResult) {}
  async generatePreview(): Promise<PreviewModelResult> {
    this.callCount += 1;
    return this.result;
  }
}

function validVegaResponse(overrides: Partial<VegaNatalResponse> = {}): VegaNatalResponse {
  return {
    requestId: "req-1",
    chartId: "chart-1",
    versions: { facts: "facts_v1", claims: "claims_v1", evidenceSchema: "evidence_v1" },
    timeContext: { timeKnown: true },
    allowedEvidence: [
      {
        id: "ev_001",
        schemaVersion: "evidence_v1",
        factsVersion: "facts_v1",
        claimsVersion: "claims_v1",
        chartId: "chart-1",
        kind: "planet_position",
        subject: "sun",
        payload: {},
        provenance: { source: "structural_claim" },
      },
      {
        id: "ev_002",
        schemaVersion: "evidence_v1",
        factsVersion: "facts_v1",
        claimsVersion: "claims_v1",
        chartId: "chart-1",
        kind: "aspect",
        subject: "sun_moon",
        payload: {},
        provenance: { source: "structural_claim" },
      },
    ],
    ...overrides,
  };
}

const WORDS_46 =
  "En este momento parece haber una tension entre lo que sientes que deberias hacer y lo que " +
  "realmente te esta pidiendo la situacion. Los factores que estamos observando en tu carta " +
  "apuntan a un periodo donde conviene mirar hacia dentro antes de decidir el siguiente paso.";

const WORDS_67 =
  "Relacionando estos factores con lo que nos has contado, tiene sentido que esta situacion te " +
  "resulte especialmente presente ahora mismo, incluso si todavia no consigues ponerle nombre " +
  "del todo. No se trata de un patron fijo, sino de un momento que invita a prestar atencion a " +
  "como estas respondiendo a lo que ocurre a tu alrededor, sin forzar todavia una conclusion " +
  "definitiva sobre lo que vendra despues.";

function validPreviewOutput(overrides: Partial<PreviewV1Output> = {}): PreviewV1Output {
  return {
    mainInsight: WORDS_46,
    evidence: [
      { id: "ev_001", label: "Factor 1", interpretationScope: "contexto" },
      { id: "ev_002", label: "Factor 2", interpretationScope: "contexto" },
    ],
    contextualInterpretation: WORDS_67,
    limitation: "Limitacion de prueba.",
    openQuestion: "¿Pregunta abierta?",
    safetyFlags: [],
    unsupportedClaims: [],
    insufficientEvidence: false,
    ...overrides,
  };
}

describe("generatePreviewForFlowAttempt", () => {
  let repository: InMemoryExperimentRepository;

  beforeEach(() => {
    repository = new InMemoryExperimentRepository();
  });

  async function createSegmentAAttemptWithProfile() {
    const user = await repository.findOrCreateExperimentUser({
      anonymousUserId: crypto.randomUUID(),
      experimentId: "vega_beachhead_v1",
      acquisition: {
        trafficSource: null,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmContent: null,
        placement: null,
        deviceType: null,
      },
      isTest: false,
    });
    const attempt = await repository.createFlowAttempt({ userId: user.id, segment: "A" });
    await repository.upsertProblemContext({
      flowAttemptId: attempt.id,
      trigger: "career",
      freeText: "Un contexto de prueba",
      textProvided: true,
    });
    await repository.upsertOwnBirthProfile({
      userId: user.id,
      birthDate: "1990-05-12",
      birthTime: "14:35",
      birthTimeKnown: true,
      place: MADRID_PLACE,
    });
    return { user, attempt };
  }

  it("journey A completo: Vega valido + OpenAI valido -> preview valida y persistida", async () => {
    const { attempt } = await createSegmentAAttemptWithProfile();
    const vega = new FakeVegaClient({ ok: true, data: validVegaResponse() });
    const openai = new FakeOpenAIClient({ ok: true, output: validPreviewOutput(), latencyMs: 10, modelId: "test-model" });

    const outcome = await generatePreviewForFlowAttempt(repository, vega, openai, new UnusedSynastryClient(), attempt.id);

    expect(outcome.status).toBe("valid");
    expect(vega.callCount).toBe(1);
    expect(openai.callCount).toBe(1);

    const persisted = await repository.getValidPreviewByFlowAttempt(attempt.id);
    expect(persisted?.generationStatus).toBe("valid");
    expect(persisted?.chartId).toBe("chart-1");
    expect(persisted?.evidenceIdsUsed).toEqual(["ev_001", "ev_002"]);
  });

  it("es idempotente: una segunda llamada devuelve la preview ya valida sin volver a llamar a Vega/OpenAI", async () => {
    const { attempt } = await createSegmentAAttemptWithProfile();
    const vega = new FakeVegaClient({ ok: true, data: validVegaResponse() });
    const openai = new FakeOpenAIClient({ ok: true, output: validPreviewOutput(), latencyMs: 10, modelId: "test-model" });

    const first = await generatePreviewForFlowAttempt(repository, vega, openai, new UnusedSynastryClient(), attempt.id);
    const second = await generatePreviewForFlowAttempt(repository, vega, openai, new UnusedSynastryClient(), attempt.id);

    expect(first.status).toBe("valid");
    expect(second.status).toBe("valid");
    if (first.status === "valid" && second.status === "valid") {
      expect(second.previewId).toBe(first.previewId);
    }
    expect(vega.callCount).toBe(1);
    expect(openai.callCount).toBe(1);
  });

  it("Vega invalido: no llama a OpenAI y persiste un error", async () => {
    const { attempt } = await createSegmentAAttemptWithProfile();
    const vega = new FakeVegaClient({ ok: false, errorType: "invalid_versions" });
    const openai = new FakeOpenAIClient({ ok: true, output: validPreviewOutput(), latencyMs: 10, modelId: "test-model" });

    const outcome = await generatePreviewForFlowAttempt(repository, vega, openai, new UnusedSynastryClient(), attempt.id);

    expect(outcome.status).toBe("error");
    if (outcome.status === "error") expect(outcome.errorType).toBe("calculation_error");
    expect(openai.callCount).toBe(0);

    const persisted = await repository.getValidPreviewByFlowAttempt(attempt.id);
    expect(persisted).toBeNull();
  });

  it("Vega con menos de 2 evidencias: no llama a OpenAI (evidencia insuficiente)", async () => {
    const { attempt } = await createSegmentAAttemptWithProfile();
    const vega = new FakeVegaClient({ ok: true, data: validVegaResponse({ allowedEvidence: [validVegaResponse().allowedEvidence[0]!] }) });
    const openai = new FakeOpenAIClient({ ok: true, output: validPreviewOutput(), latencyMs: 10, modelId: "test-model" });

    const outcome = await generatePreviewForFlowAttempt(repository, vega, openai, new UnusedSynastryClient(), attempt.id);

    expect(outcome.status).toBe("error");
    if (outcome.status === "error") expect(outcome.errorType).toBe("calculation_error");
    expect(openai.callCount).toBe(0);
  });

  it("OpenAI alucina un ID de evidencia: la preview se rechaza y nunca se muestra", async () => {
    const { attempt } = await createSegmentAAttemptWithProfile();
    const vega = new FakeVegaClient({ ok: true, data: validVegaResponse() });
    const hallucinated = validPreviewOutput({
      evidence: [
        { id: "ev_001", label: "Factor 1", interpretationScope: "contexto" },
        { id: "ev_999_inventado", label: "Factor inventado", interpretationScope: "contexto" },
      ],
    });
    const openai = new FakeOpenAIClient({ ok: true, output: hallucinated, latencyMs: 10, modelId: "test-model" });

    const outcome = await generatePreviewForFlowAttempt(repository, vega, openai, new UnusedSynastryClient(), attempt.id);

    expect(outcome.status).toBe("error");
    if (outcome.status === "error") expect(outcome.errorType).toBe("unsupported_evidence");

    const persisted = await repository.getValidPreviewByFlowAttempt(attempt.id);
    expect(persisted).toBeNull();
  });

  it("unsupported_claims no vacio: la preview se rechaza", async () => {
    const { attempt } = await createSegmentAAttemptWithProfile();
    const vega = new FakeVegaClient({ ok: true, data: validVegaResponse() });
    const openai = new FakeOpenAIClient({
      ok: true,
      output: validPreviewOutput({ unsupportedClaims: ["afirmacion sin respaldo"] }),
      latencyMs: 10,
      modelId: "test-model",
    });

    const outcome = await generatePreviewForFlowAttempt(repository, vega, openai, new UnusedSynastryClient(), attempt.id);

    expect(outcome.status).toBe("error");
    if (outcome.status === "error") expect(outcome.errorType).toBe("unsupported_evidence");
  });

  it("timeout de OpenAI se persiste como llm_timeout", async () => {
    const { attempt } = await createSegmentAAttemptWithProfile();
    const vega = new FakeVegaClient({ ok: true, data: validVegaResponse() });
    const openai = new FakeOpenAIClient({ ok: false, errorType: "llm_timeout" });

    const outcome = await generatePreviewForFlowAttempt(repository, vega, openai, new UnusedSynastryClient(), attempt.id);

    expect(outcome.status).toBe("error");
    if (outcome.status === "error") expect(outcome.errorType).toBe("llm_timeout");
  });

  it("segmento B: delega en el pipeline de sinastria, nunca llama al cliente natal", async () => {
    // La cobertura completa de segmento B (Vega synastry, OpenAI,
    // insufficient_data, idempotencia, borrado de partner_input...) vive
    // en synastry-preview-service.test.ts. Este test es solo una
    // regresion: confirma que A y B nunca comparten el cliente Vega
    // natal, ni siquiera cuando B falla por falta de datos.
    const user = await repository.findOrCreateExperimentUser({
      anonymousUserId: crypto.randomUUID(),
      experimentId: "vega_beachhead_v1",
      acquisition: {
        trafficSource: null,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmContent: null,
        placement: null,
        deviceType: null,
      },
      isTest: false,
    });
    const attempt = await repository.createFlowAttempt({ userId: user.id, segment: "B" });
    await repository.upsertProblemContext({
      flowAttemptId: attempt.id,
      trigger: "distance",
      freeText: null,
      textProvided: false,
    });

    const vega = new FakeVegaClient({ ok: true, data: validVegaResponse() });
    const openai = new FakeOpenAIClient({ ok: true, output: validPreviewOutput(), latencyMs: 10, modelId: "test-model" });

    // Sin perfil propio ni partner_input: deriveSynastryEvidence falla
    // antes de necesitar el cliente de sinastria (nunca se llega a
    // llamarlo), asi que UnusedSynastryClient tambien sirve aqui.
    const outcome = await generatePreviewForFlowAttempt(repository, vega, openai, new UnusedSynastryClient(), attempt.id);

    expect(outcome.status).toBe("error");
    expect(vega.callCount).toBe(0);
    expect(openai.callCount).toBe(0);
  });

  it("flow_attempt inexistente: not_found", async () => {
    const vega = new FakeVegaClient({ ok: true, data: validVegaResponse() });
    const openai = new FakeOpenAIClient({ ok: true, output: validPreviewOutput(), latencyMs: 10, modelId: "test-model" });

    const outcome = await generatePreviewForFlowAttempt(
      repository,
      vega,
      openai,
      new UnusedSynastryClient(),
      crypto.randomUUID()
    );

    expect(outcome.status).toBe("not_found");
  });
});
