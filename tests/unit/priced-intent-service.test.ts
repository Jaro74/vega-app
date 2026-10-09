import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryExperimentRepository } from "@/libs/db/memory-repository";
import { createPricedAccessIntentForFlowAttempt } from "@/libs/experiment/priced-intent-service";

async function createAttempt(repository: InMemoryExperimentRepository) {
  const user = await repository.findOrCreateExperimentUser({
    anonymousUserId: crypto.randomUUID(),
    experimentId: "vega_beachhead_v1",
    acquisition: {
      trafficSource: "direct",
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmContent: null,
      placement: null,
      deviceType: null,
    },
    isTest: false,
  });
  return repository.createFlowAttempt({ userId: user.id, segment: "A" });
}

async function createValidPreview(repository: InMemoryExperimentRepository, flowAttemptId: string) {
  await repository.createPreview({
    flowAttemptId,
    schemaVersion: "preview_v1",
    promptVersion: "preview_prompt_a_v1",
    modelId: "test-model",
    partnerPrecision: null,
    chartId: "chart-1",
    evidenceSchemaVersion: "evidence_v1",
    factsVersion: "facts_v1",
    claimsVersion: "claims_v1",
    timeKnown: true,
    evidenceIdsUsed: ["ev_001", "ev_002"],
    preview: null,
    generationStatus: "valid",
    errorType: null,
    latencyMs: 10,
    usedFreeText: false,
  });
}

describe("createPricedAccessIntentForFlowAttempt", () => {
  let repository: InMemoryExperimentRepository;

  beforeEach(() => {
    repository = new InMemoryExperimentRepository();
  });

  it("devuelve not_found si el flow_attempt no existe", async () => {
    const outcome = await createPricedAccessIntentForFlowAttempt(repository, "flow-inexistente");
    expect(outcome.status).toBe("not_found");
  });

  it("devuelve no_valid_preview si no hay preview valida (nunca basta con llegar al paywall sin preview), sin efectos en la persistencia", async () => {
    const attempt = await createAttempt(repository);
    const outcome = await createPricedAccessIntentForFlowAttempt(repository, attempt.id);
    expect(outcome.status).toBe("no_valid_preview");

    // El rechazo no debe crear una fila en priced_access_intents ni avanzar currentStep.
    const intent = await repository.getPricedAccessIntentByFlowAttempt(attempt.id);
    expect(intent).toBeNull();
    const unchanged = await repository.getFlowAttemptById(attempt.id);
    expect(unchanged?.currentStep).toBeNull();
  });

  it("crea la intencion, persiste currentStep='access_intent' y devuelve wasNew=true la primera vez", async () => {
    const attempt = await createAttempt(repository);
    await createValidPreview(repository, attempt.id);

    const outcome = await createPricedAccessIntentForFlowAttempt(repository, attempt.id);
    expect(outcome.status).toBe("ok");
    if (outcome.status === "ok") expect(outcome.wasNew).toBe(true);

    const updated = await repository.getFlowAttemptById(attempt.id);
    expect(updated?.currentStep).toBe("access_intent");

    const intent = await repository.getPricedAccessIntentByFlowAttempt(attempt.id);
    expect(intent?.priceMinor).toBe(999);
    expect(intent?.currency).toBe("EUR");
  });

  it("un segundo intento (doble clic / reintento) devuelve wasNew=false sin duplicar la fila", async () => {
    const attempt = await createAttempt(repository);
    await createValidPreview(repository, attempt.id);

    const first = await createPricedAccessIntentForFlowAttempt(repository, attempt.id);
    const second = await createPricedAccessIntentForFlowAttempt(repository, attempt.id);

    expect(first.status).toBe("ok");
    expect(second.status).toBe("ok");
    if (first.status === "ok" && second.status === "ok") {
      expect(first.wasNew).toBe(true);
      expect(second.wasNew).toBe(false);
    }
  });
});
