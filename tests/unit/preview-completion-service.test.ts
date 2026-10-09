import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryExperimentRepository } from "@/libs/db/memory-repository";
import { completePreviewForFlowAttempt } from "@/libs/experiment/preview-completion-service";

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

describe("completePreviewForFlowAttempt", () => {
  let repository: InMemoryExperimentRepository;

  beforeEach(() => {
    repository = new InMemoryExperimentRepository();
  });

  it("devuelve not_found si el flow_attempt no existe", async () => {
    const outcome = await completePreviewForFlowAttempt(repository, "flow-inexistente");
    expect(outcome.status).toBe("not_found");
  });

  it("devuelve no_valid_preview si no hay preview valida, sin efectos en la persistencia", async () => {
    const attempt = await createAttempt(repository);
    const outcome = await completePreviewForFlowAttempt(repository, attempt.id);
    expect(outcome.status).toBe("no_valid_preview");

    // El rechazo no debe dejar currentStep en un estado intermedio.
    const unchanged = await repository.getFlowAttemptById(attempt.id);
    expect(unchanged?.currentStep).toBeNull();
  });

  it("devuelve ok y persiste currentStep='preview' cuando existe una preview valida", async () => {
    const attempt = await createAttempt(repository);
    await createValidPreview(repository, attempt.id);

    const outcome = await completePreviewForFlowAttempt(repository, attempt.id);
    expect(outcome.status).toBe("ok");

    const updated = await repository.getFlowAttemptById(attempt.id);
    expect(updated?.currentStep).toBe("preview");
  });

  it("un reintento tras un checkpoint ya confirmado (recuperacion de un fallo de red en el cliente) sigue devolviendo ok", async () => {
    const attempt = await createAttempt(repository);
    await createValidPreview(repository, attempt.id);

    const first = await completePreviewForFlowAttempt(repository, attempt.id);
    const second = await completePreviewForFlowAttempt(repository, attempt.id);

    expect(first.status).toBe("ok");
    expect(second.status).toBe("ok");

    const updated = await repository.getFlowAttemptById(attempt.id);
    expect(updated?.currentStep).toBe("preview");
  });
});
