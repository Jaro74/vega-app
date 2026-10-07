import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryExperimentRepository } from "@/libs/db/memory-repository";
import { WAITLIST_CONSENT_VERSION } from "@/libs/experiment/constants";
import { submitWaitlistEntry } from "@/libs/experiment/waitlist-service";

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
  });
}

describe("submitWaitlistEntry", () => {
  let repository: InMemoryExperimentRepository;

  beforeEach(() => {
    repository = new InMemoryExperimentRepository();
  });

  it("devuelve not_found si el flow_attempt no existe", async () => {
    const outcome = await submitWaitlistEntry(repository, {
      flowAttemptId: "flow-inexistente",
      email: "usuario@example.com",
      consentVersion: WAITLIST_CONSENT_VERSION,
    });
    expect(outcome.status).toBe("not_found");
  });

  it("devuelve invalid_consent_version si la version no coincide con la actual, sin efectos en la persistencia", async () => {
    const attempt = await createAttempt(repository);
    await createValidPreview(repository, attempt.id);
    await repository.createPricedAccessIntentIfNotExists({ flowAttemptId: attempt.id, priceMinor: 999, currency: "EUR" });

    const outcome = await submitWaitlistEntry(repository, {
      flowAttemptId: attempt.id,
      email: "usuario@example.com",
      consentVersion: "una_version_vieja",
    });
    expect(outcome.status).toBe("invalid_consent_version");

    // El rechazo no debe crear una fila en waitlist ni avanzar currentStep,
    // aunque ya exista una intencion de pago confirmada.
    const entry = await repository.getWaitlistEntryByFlowAttempt(attempt.id);
    expect(entry).toBeNull();
    const unchanged = await repository.getFlowAttemptById(attempt.id);
    expect(unchanged?.currentStep).not.toBe("waitlist");
  });

  it("devuelve no_priced_access_intent si existe preview valida pero NO hay intencion de pago confirmada, sin efectos en la persistencia", async () => {
    const attempt = await createAttempt(repository);
    await createValidPreview(repository, attempt.id);

    const outcome = await submitWaitlistEntry(repository, {
      flowAttemptId: attempt.id,
      email: "usuario@example.com",
      consentVersion: WAITLIST_CONSENT_VERSION,
    });
    expect(outcome.status).toBe("no_priced_access_intent");

    const entry = await repository.getWaitlistEntryByFlowAttempt(attempt.id);
    expect(entry).toBeNull();
    const unchanged = await repository.getFlowAttemptById(attempt.id);
    expect(unchanged?.currentStep).toBeNull();
  });

  it("crea la entrada, persiste currentStep='waitlist' y devuelve wasNew=true tras confirmar priced_access_intent", async () => {
    const attempt = await createAttempt(repository);
    await createValidPreview(repository, attempt.id);
    await repository.createPricedAccessIntentIfNotExists({ flowAttemptId: attempt.id, priceMinor: 999, currency: "EUR" });

    const outcome = await submitWaitlistEntry(repository, {
      flowAttemptId: attempt.id,
      email: "usuario@example.com",
      consentVersion: WAITLIST_CONSENT_VERSION,
    });
    expect(outcome.status).toBe("ok");
    if (outcome.status === "ok") expect(outcome.wasNew).toBe(true);

    const updated = await repository.getFlowAttemptById(attempt.id);
    expect(updated?.currentStep).toBe("waitlist");

    const entry = await repository.getWaitlistEntryByFlowAttempt(attempt.id);
    expect(entry?.email).toBe("usuario@example.com");
    expect(entry?.consentVersion).toBe(WAITLIST_CONSENT_VERSION);
  });

  it("un segundo envio (reintento) devuelve wasNew=false sin sobrescribir el email ya guardado", async () => {
    const attempt = await createAttempt(repository);
    await createValidPreview(repository, attempt.id);
    await repository.createPricedAccessIntentIfNotExists({ flowAttemptId: attempt.id, priceMinor: 999, currency: "EUR" });

    const first = await submitWaitlistEntry(repository, {
      flowAttemptId: attempt.id,
      email: "primero@example.com",
      consentVersion: WAITLIST_CONSENT_VERSION,
    });
    const second = await submitWaitlistEntry(repository, {
      flowAttemptId: attempt.id,
      email: "segundo@example.com",
      consentVersion: WAITLIST_CONSENT_VERSION,
    });

    expect(first.status).toBe("ok");
    expect(second.status).toBe("ok");
    if (first.status === "ok" && second.status === "ok") {
      expect(first.wasNew).toBe(true);
      expect(second.wasNew).toBe(false);
    }

    const entry = await repository.getWaitlistEntryByFlowAttempt(attempt.id);
    expect(entry?.email).toBe("primero@example.com");
  });
});
