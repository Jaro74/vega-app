import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryExperimentRepository } from "@/libs/db/memory-repository";
import type { ExperimentRepository } from "@/libs/db/types";
import { generatePreviewForFlowAttempt } from "@/libs/experiment/preview-service";
import type { PreviewModelClient, PreviewModelResult } from "@/libs/openai/client";
import type { VegaEvidenceClient, VegaFetchResult } from "@/libs/vega/client";
import type { VegaSynastryClient, VegaSynastryFetchResult } from "@/libs/vega/synastry-client";
import type { PreviewV1Output } from "@/types/preview";

const MADRID_PLACE = {
  placeLabel: "Madrid",
  countryCode: "ES",
  latitude: 40.4168,
  longitude: -3.7038,
  timezoneId: "Europe/Madrid",
};

const VALENCIA_PLACE = {
  placeLabel: "Valencia",
  countryCode: "ES",
  latitude: 39.4699,
  longitude: -0.3763,
  timezoneId: "Europe/Madrid",
};

class UnusedNatalVegaClient implements VegaEvidenceClient {
  async fetchNatalEvidence(): Promise<VegaFetchResult> {
    throw new Error("no deberia llamarse desde el journey de segmento B");
  }
}

class FakeSynastryClient implements VegaSynastryClient {
  callCount = 0;
  constructor(private readonly result: VegaSynastryFetchResult) {}
  async fetchSynastryEvidence(): Promise<VegaSynastryFetchResult> {
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

function okSynastryResponse(overrides: Record<string, unknown> = {}): VegaSynastryFetchResult {
  return {
    ok: true,
    data: {
      status: "ok",
      requestId: "req-1",
      chartIdA: "chart-a",
      chartIdB: "chart-b",
      versions: { facts: "facts_v1", synastryFacts: "syn_facts_v1", synastryClaims: "syn_claims_v1", synastryEvidenceSchema: "syn_evidence_v1" },
      timeContext: { timeKnownA: true, timeKnownB: true },
      precision: { a: "full", b: "full" },
      allowedEvidence: [
        {
          id: "ev_ab_001",
          synEvidenceSchemaVersion: "syn_evidence_v1",
          synFactsVersion: "syn_facts_v1",
          synClaimsVersion: "syn_claims_v1",
          factsVersion: "facts_v1",
          chartIdA: "chart-a",
          chartIdB: "chart-b",
          kind: "inter_chart_aspect",
          subject: { personABody: "sun", personBBody: "moon" },
          payload: { type: "trigono", toca_luminaria: true, toca_angulo: false, orbe_max: 8 },
          provenance: { source: "synastry_structural_claim" },
        },
        {
          id: "ev_ab_002",
          synEvidenceSchemaVersion: "syn_evidence_v1",
          synFactsVersion: "syn_facts_v1",
          synClaimsVersion: "syn_claims_v1",
          factsVersion: "facts_v1",
          chartIdA: "chart-a",
          chartIdB: "chart-b",
          kind: "inter_chart_aspect",
          subject: { personABody: "venus", personBBody: "mars" },
          payload: { type: "conjuncion", toca_luminaria: false, toca_angulo: false, orbe_max: 8 },
          provenance: { source: "synastry_structural_claim" },
        },
      ],
      ...overrides,
    },
  } as VegaSynastryFetchResult;
}

const WORDS_46 =
  "Entre vosotros parece haber una combinacion de factores que invita tanto a la cercania como a " +
  "cierta friccion ocasional. Lo que estamos observando en la comparacion entre ambas cartas apunta " +
  "a una dinamica que conviene explorar con calma, sin sacar conclusiones cerradas todavia.";

const WORDS_67 =
  "Relacionando estos factores con lo que nos has contado, tiene sentido que esta dinamica se note " +
  "especialmente en ciertos momentos de la relacion, incluso si todavia no consigues ponerle nombre " +
  "del todo. No se trata de un patron fijo entre vosotros, sino de una tendencia que invita a prestar " +
  "atencion a como respondeis cada uno cuando aparece, sin forzar todavia una conclusion sobre el futuro.";

function validPreviewOutput(overrides: Partial<PreviewV1Output> = {}): PreviewV1Output {
  return {
    mainInsight: WORDS_46,
    evidence: [
      { id: "ev_ab_001", label: "Factor 1", interpretationScope: "contexto" },
      { id: "ev_ab_002", label: "Factor 2", interpretationScope: "contexto" },
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

describe("generatePreviewForFlowAttempt (segmento B, sinastria)", () => {
  let repository: InMemoryExperimentRepository;

  beforeEach(() => {
    repository = new InMemoryExperimentRepository();
  });

  async function createSegmentBAttempt(partnerPlace: typeof VALENCIA_PLACE | null = VALENCIA_PLACE, partnerTimeKnown = true) {
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
    await repository.upsertPartnerInput({
      flowAttemptId: attempt.id,
      birthDate: "1988-03-02",
      birthTime: partnerTimeKnown ? "09:15" : null,
      birthTimeKnown: partnerPlace ? partnerTimeKnown : false,
      place: partnerPlace,
    });
    const precision = partnerPlace ? (partnerTimeKnown ? "full" : "partial") : "minimal";
    const updated = await repository.updateFlowAttemptProgress({ flowAttemptId: attempt.id, partnerPrecision: precision });
    return { user, attempt: updated };
  }

  it("B full: Vega + OpenAI validos -> preview valida y persistida con campos de sinastria", async () => {
    const { attempt } = await createSegmentBAttempt(VALENCIA_PLACE, true);
    const synastry = new FakeSynastryClient(okSynastryResponse());
    const openai = new FakeOpenAIClient({ ok: true, output: validPreviewOutput(), latencyMs: 10, modelId: "test-model" });

    const outcome = await generatePreviewForFlowAttempt(repository, new UnusedNatalVegaClient(), openai, synastry, attempt.id);

    expect(outcome.status).toBe("valid");
    expect(synastry.callCount).toBe(1);
    expect(openai.callCount).toBe(1);

    const persisted = await repository.getValidPreviewByFlowAttempt(attempt.id);
    expect(persisted?.generationStatus).toBe("valid");
    expect(persisted?.partnerPrecision).toBe("full");
    expect(persisted?.chartId).toBe("chart-a");
    expect(persisted?.chartIdB).toBe("chart-b");
    expect(persisted?.synastryFactsVersion).toBe("syn_facts_v1");
    expect(persisted?.timeKnownB).toBe(true);
    expect(persisted?.evidenceIdsUsed).toEqual(["ev_ab_001", "ev_ab_002"]);
  });

  it("B partial: Vega ok con partial/full -> preview valida", async () => {
    const { attempt } = await createSegmentBAttempt(VALENCIA_PLACE, false);
    const synastry = new FakeSynastryClient(
      okSynastryResponse({ precision: { a: "full", b: "partial" }, timeContext: { timeKnownA: true, timeKnownB: false } })
    );
    const openai = new FakeOpenAIClient({ ok: true, output: validPreviewOutput(), latencyMs: 10, modelId: "test-model" });

    const outcome = await generatePreviewForFlowAttempt(repository, new UnusedNatalVegaClient(), openai, synastry, attempt.id);

    expect(outcome.status).toBe("valid");
  });

  it("minimal (sin lugar): insufficient_data, nunca llama a OpenAI, persiste una fila insufficient_data", async () => {
    const { attempt } = await createSegmentBAttempt(null, false);
    const synastry = new FakeSynastryClient({ ok: true, data: { status: "insufficient_data", requestId: "req-1", insufficientParticipants: ["b"] } });
    const openai = new FakeOpenAIClient({ ok: true, output: validPreviewOutput(), latencyMs: 10, modelId: "test-model" });

    const outcome = await generatePreviewForFlowAttempt(repository, new UnusedNatalVegaClient(), openai, synastry, attempt.id);

    expect(outcome.status).toBe("insufficient_data");
    if (outcome.status === "insufficient_data") {
      expect(outcome.reason).toBe("participant_minimal");
      expect(outcome.insufficientParticipants).toEqual(["b"]);
    }
    expect(openai.callCount).toBe(0);

    const derived = await repository.getPartnerDerivedProfileByFlowAttempt(attempt.id);
    expect(derived?.derivedFeatures.status).toBe("insufficient_data");
  });

  it("segunda llamada tras insufficient_data: no vuelve a llamar a Vega ni a OpenAI", async () => {
    const { attempt } = await createSegmentBAttempt(null, false);
    const synastry = new FakeSynastryClient({ ok: true, data: { status: "insufficient_data", requestId: "req-1", insufficientParticipants: ["b"] } });
    const openai = new FakeOpenAIClient({ ok: true, output: validPreviewOutput(), latencyMs: 10, modelId: "test-model" });

    await generatePreviewForFlowAttempt(repository, new UnusedNatalVegaClient(), openai, synastry, attempt.id);
    const second = await generatePreviewForFlowAttempt(repository, new UnusedNatalVegaClient(), openai, synastry, attempt.id);

    expect(second.status).toBe("insufficient_data");
    expect(synastry.callCount).toBe(1);
    expect(openai.callCount).toBe(0);
  });

  it("es idempotente cuando ya hay preview valida: Vega y OpenAI se llaman una sola vez", async () => {
    const { attempt } = await createSegmentBAttempt(VALENCIA_PLACE, true);
    const synastry = new FakeSynastryClient(okSynastryResponse());
    const openai = new FakeOpenAIClient({ ok: true, output: validPreviewOutput(), latencyMs: 10, modelId: "test-model" });

    const first = await generatePreviewForFlowAttempt(repository, new UnusedNatalVegaClient(), openai, synastry, attempt.id);
    const second = await generatePreviewForFlowAttempt(repository, new UnusedNatalVegaClient(), openai, synastry, attempt.id);

    expect(first.status).toBe("valid");
    expect(second.status).toBe("valid");
    if (first.status === "valid" && second.status === "valid") {
      expect(second.previewId).toBe(first.previewId);
    }
    expect(synastry.callCount).toBe(1);
    expect(openai.callCount).toBe(1);
  });

  it("Vega invalido: error, partner_input se conserva, no se crea partner_derived_profile", async () => {
    const { attempt } = await createSegmentBAttempt(VALENCIA_PLACE, true);
    const synastry = new FakeSynastryClient({ ok: false, errorType: "invalid_versions" });
    const openai = new FakeOpenAIClient({ ok: true, output: validPreviewOutput(), latencyMs: 10, modelId: "test-model" });

    const outcome = await generatePreviewForFlowAttempt(repository, new UnusedNatalVegaClient(), openai, synastry, attempt.id);

    expect(outcome.status).toBe("error");
    if (outcome.status === "error") expect(outcome.errorType).toBe("calculation_error");
    expect(openai.callCount).toBe(0);

    const partnerInput = await repository.getPartnerInputByFlowAttempt(attempt.id);
    expect(partnerInput).not.toBeNull();
    const derived = await repository.getPartnerDerivedProfileByFlowAttempt(attempt.id);
    expect(derived).toBeNull();
  });

  it("OpenAI falla tras una derivacion correcta: partner_input ya se borro, un reintento no vuelve a llamar a Vega", async () => {
    const { attempt } = await createSegmentBAttempt(VALENCIA_PLACE, true);
    const synastry = new FakeSynastryClient(okSynastryResponse());
    const failingOpenai = new FakeOpenAIClient({ ok: false, errorType: "llm_timeout" });

    const first = await generatePreviewForFlowAttempt(repository, new UnusedNatalVegaClient(), failingOpenai, synastry, attempt.id);
    expect(first.status).toBe("error");
    if (first.status === "error") expect(first.errorType).toBe("llm_timeout");

    const partnerInputAfterFailure = await repository.getPartnerInputByFlowAttempt(attempt.id);
    expect(partnerInputAfterFailure).toBeNull();
    const derived = await repository.getPartnerDerivedProfileByFlowAttempt(attempt.id);
    expect(derived?.derivedFeatures.status).toBe("ok");

    const workingOpenai = new FakeOpenAIClient({ ok: true, output: validPreviewOutput(), latencyMs: 10, modelId: "test-model" });
    const retry = await generatePreviewForFlowAttempt(repository, new UnusedNatalVegaClient(), workingOpenai, synastry, attempt.id);

    expect(retry.status).toBe("valid");
    expect(synastry.callCount).toBe(1);
    expect(workingOpenai.callCount).toBe(1);
  });

  // Revision de seguridad 2026-10-07 (VEGA_Base_Juridica_Segmento_B_v1.md):
  // un partner_derived_profile cuyo deleteAfter ya ha pasado no debe
  // reutilizarse, con independencia de si el cron de purga ya lo borro
  // fisicamente. Mismo punto de partida que el test anterior (OpenAI
  // falla tras una derivacion de Vega correcta), pero aqui se fuerza el
  // deleteAfter de esa fila al pasado antes del reintento -- la API
  // publica nunca produce una fila ya caducada, de ahi la manipulacion
  // directa del estado interno via cast. Como partner_input ya se borro
  // tras la primera derivacion (igual que en el test anterior), el
  // pipeline NO puede volver a llamar a Vega sin esos datos: lo que esta
  // prueba demuestra es que, sin cache valido, termina en
  // "calculation_error" en vez de reutilizar silenciosamente la fila
  // caducada -- no que repita la llamada a Vega.
  it("partner_derived_profile caducado (deleteAfter en el pasado): no se reutiliza, falla limpiamente en vez de servir datos caducados", async () => {
    const { attempt } = await createSegmentBAttempt(VALENCIA_PLACE, true);
    const synastry = new FakeSynastryClient(okSynastryResponse());
    const failingOpenai = new FakeOpenAIClient({ ok: false, errorType: "llm_timeout" });

    const first = await generatePreviewForFlowAttempt(repository, new UnusedNatalVegaClient(), failingOpenai, synastry, attempt.id);
    expect(first.status).toBe("error");

    const derivedBeforeExpiry = await repository.getPartnerDerivedProfileByFlowAttempt(attempt.id);
    expect(derivedBeforeExpiry?.derivedFeatures.status).toBe("ok");

    // Fuerza la caducidad: delete_after ya en el pasado.
    const internals = repository as unknown as {
      partnerDerivedProfileByFlowAttempt: Map<string, { deleteAfter: string }>;
    };
    const stored = internals.partnerDerivedProfileByFlowAttempt.get(attempt.id);
    if (!stored) throw new Error("fixture invalido: no hay partner_derived_profile que caducar");
    stored.deleteAfter = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const derivedWhileExpired = await repository.getPartnerDerivedProfileByFlowAttempt(attempt.id);
    expect(derivedWhileExpired).toBeNull();

    // partner_input ya se borro tras la primera derivacion (igual que en
    // el test anterior), asi que sin cache valido el pipeline no puede
    // recalcular y debe terminar en "calculation_error" -- no en una
    // reutilizacion silenciosa de la fila caducada.
    const workingOpenai = new FakeOpenAIClient({ ok: true, output: validPreviewOutput(), latencyMs: 10, modelId: "test-model" });
    const retry = await generatePreviewForFlowAttempt(repository, new UnusedNatalVegaClient(), workingOpenai, synastry, attempt.id);

    expect(retry.status).toBe("error");
    if (retry.status === "error") expect(retry.errorType).toBe("calculation_error");
    // Sin partner_input (ya borrado tras la primera derivacion), no hay
    // datos con los que volver a llamar a Vega -- el callCount se
    // mantiene en 1 (la llamada original), confirmando que la fila
    // caducada no se usa para evitar esa segunda llamada ni para
    // fabricar un resultado.
    expect(synastry.callCount).toBe(1);
    expect(workingOpenai.callCount).toBe(0);
  });

  // Complementa el test anterior cubriendo el caso en que partner_input
  // SI sobrevive (borrado fallido, mismo patron de Proxy que
  // "deletePartnerInput falla" mas abajo): con cache caducado pero datos
  // en bruto todavia disponibles, el pipeline debe volver a llamar a
  // Vega -- no basta con no reutilizar el cache, tiene que recalcular
  // cuando los datos para hacerlo siguen existiendo.
  it("partner_derived_profile caducado con partner_input todavia disponible: recalcula llamando otra vez a Vega", async () => {
    const { attempt } = await createSegmentBAttempt(VALENCIA_PLACE, true);
    const synastry = new FakeSynastryClient(okSynastryResponse());
    const failingOpenai = new FakeOpenAIClient({ ok: false, errorType: "llm_timeout" });

    const throwingRepository: ExperimentRepository = new Proxy(repository, {
      get(target, prop, receiver) {
        if (prop === "deletePartnerInput") {
          return async () => {
            throw new Error("fallo simulado de borrado");
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    });

    const first = await generatePreviewForFlowAttempt(throwingRepository, new UnusedNatalVegaClient(), failingOpenai, synastry, attempt.id);
    expect(first.status).toBe("error");

    const partnerInputStillThere = await repository.getPartnerInputByFlowAttempt(attempt.id);
    expect(partnerInputStillThere).not.toBeNull();

    const internals = repository as unknown as {
      partnerDerivedProfileByFlowAttempt: Map<string, { deleteAfter: string }>;
    };
    const stored = internals.partnerDerivedProfileByFlowAttempt.get(attempt.id);
    if (!stored) throw new Error("fixture invalido: no hay partner_derived_profile que caducar");
    stored.deleteAfter = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const workingOpenai = new FakeOpenAIClient({ ok: true, output: validPreviewOutput(), latencyMs: 10, modelId: "test-model" });
    const retry = await generatePreviewForFlowAttempt(repository, new UnusedNatalVegaClient(), workingOpenai, synastry, attempt.id);

    expect(retry.status).toBe("valid");
    expect(synastry.callCount).toBe(2);
    expect(workingOpenai.callCount).toBe(1);
  });

  it("Vega ok con menos de 2 evidencias: insufficient_data por evidencia insuficiente, nunca llama a OpenAI", async () => {
    const { attempt } = await createSegmentBAttempt(VALENCIA_PLACE, true);
    const single = okSynastryResponse();
    if (single.ok && single.data.status === "ok") {
      single.data.allowedEvidence = [single.data.allowedEvidence[0]!];
    }
    const synastry = new FakeSynastryClient(single);
    const openai = new FakeOpenAIClient({ ok: true, output: validPreviewOutput(), latencyMs: 10, modelId: "test-model" });

    const outcome = await generatePreviewForFlowAttempt(repository, new UnusedNatalVegaClient(), openai, synastry, attempt.id);

    expect(outcome.status).toBe("insufficient_data");
    if (outcome.status === "insufficient_data") expect(outcome.reason).toBe("insufficient_evidence");
    expect(openai.callCount).toBe(0);
  });

  it("deletePartnerInput falla: la preview se genera igualmente (limpieza best-effort)", async () => {
    const { attempt } = await createSegmentBAttempt(VALENCIA_PLACE, true);
    const synastry = new FakeSynastryClient(okSynastryResponse());
    const openai = new FakeOpenAIClient({ ok: true, output: validPreviewOutput(), latencyMs: 10, modelId: "test-model" });

    const throwingRepository: ExperimentRepository = new Proxy(repository, {
      get(target, prop, receiver) {
        if (prop === "deletePartnerInput") {
          return async () => {
            throw new Error("fallo simulado de borrado");
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    });

    const outcome = await generatePreviewForFlowAttempt(throwingRepository, new UnusedNatalVegaClient(), openai, synastry, attempt.id);
    expect(outcome.status).toBe("valid");
  });

  it("sin partner_input y sin derivacion previa: calculation_error", async () => {
    const { attempt } = await createSegmentBAttempt(VALENCIA_PLACE, true);
    await repository.deletePartnerInput(attempt.id);
    const synastry = new FakeSynastryClient(okSynastryResponse());
    const openai = new FakeOpenAIClient({ ok: true, output: validPreviewOutput(), latencyMs: 10, modelId: "test-model" });

    const outcome = await generatePreviewForFlowAttempt(repository, new UnusedNatalVegaClient(), openai, synastry, attempt.id);

    expect(outcome.status).toBe("error");
    if (outcome.status === "error") expect(outcome.errorType).toBe("calculation_error");
    expect(synastry.callCount).toBe(0);
  });

  it("OpenAI intercambia los roles A/B: la preview se rechaza y nunca se persiste como valida", async () => {
    const { attempt } = await createSegmentBAttempt(VALENCIA_PLACE, true);
    const synastry = new FakeSynastryClient(okSynastryResponse());
    // ev_ab_002 es venus(A)/mars(B): el texto atribuye Marte a "tu", una
    // inversion de rol que synastry-preview-generation.ts debe rechazar.
    const swapped = validPreviewOutput({ mainInsight: `${WORDS_46} Esto conecta especialmente con tu Marte.` });
    const openai = new FakeOpenAIClient({ ok: true, output: swapped, latencyMs: 10, modelId: "test-model" });

    const outcome = await generatePreviewForFlowAttempt(repository, new UnusedNatalVegaClient(), openai, synastry, attempt.id);

    expect(outcome.status).toBe("error");
    if (outcome.status === "error") expect(outcome.errorType).toBe("unsupported_evidence");

    const persisted = await repository.getValidPreviewByFlowAttempt(attempt.id);
    expect(persisted).toBeNull();
  });
});
