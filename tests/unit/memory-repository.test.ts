import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryExperimentRepository } from "@/libs/db/memory-repository";
import type { PartnerDerivedFeatures, PartnerDerivedProfileRecord } from "@/libs/db/types";

const acquisition = {
  trafficSource: "meta",
  utmSource: "meta",
  utmMedium: "paid_social",
  utmCampaign: "vega_beachhead_v1_es",
  utmContent: "neutral_v1",
  placement: "instagram_feed",
  deviceType: "mobile",
};

describe("InMemoryExperimentRepository", () => {
  let repository: InMemoryExperimentRepository;

  beforeEach(() => {
    repository = new InMemoryExperimentRepository();
  });

  it("crea un experiment_user nuevo cuando el anonymous_user_id no existe", async () => {
    const user = await repository.findOrCreateExperimentUser({
      anonymousUserId: "11111111-1111-1111-1111-111111111111",
      experimentId: "vega_beachhead_v1",
      acquisition,
      isTest: false,
    });

    expect(user.anonymousUserId).toBe("11111111-1111-1111-1111-111111111111");
    expect(user.acquisition).toEqual(acquisition);
    expect(user.isTest).toBe(false);
  });

  it("no duplica experiment_users para el mismo anonymous_user_id", async () => {
    const first = await repository.findOrCreateExperimentUser({
      anonymousUserId: "22222222-2222-2222-2222-222222222222",
      experimentId: "vega_beachhead_v1",
      acquisition,
      isTest: false,
    });
    const second = await repository.findOrCreateExperimentUser({
      anonymousUserId: "22222222-2222-2222-2222-222222222222",
      experimentId: "vega_beachhead_v1",
      acquisition,
      isTest: false,
    });

    expect(second.id).toBe(first.id);
  });

  it("no sobrescribe la adquisicion original en visitas posteriores", async () => {
    await repository.findOrCreateExperimentUser({
      anonymousUserId: "33333333-3333-3333-3333-333333333333",
      experimentId: "vega_beachhead_v1",
      acquisition,
      isTest: false,
    });

    const revisit = await repository.findOrCreateExperimentUser({
      anonymousUserId: "33333333-3333-3333-3333-333333333333",
      experimentId: "vega_beachhead_v1",
      acquisition: { ...acquisition, utmSource: "google", placement: "otro" },
      isTest: false,
    });

    expect(revisit.acquisition.utmSource).toBe("meta");
    expect(revisit.acquisition.placement).toBe("instagram_feed");
  });

  it("persiste el flag de tester en la creacion", async () => {
    const user = await repository.findOrCreateExperimentUser({
      anonymousUserId: "44444444-4444-4444-4444-444444444444",
      experimentId: "vega_beachhead_v1",
      acquisition,
      isTest: true,
    });

    expect(user.isTest).toBe(true);
  });

  it("marca el primer flow attempt como primario", async () => {
    const user = await repository.findOrCreateExperimentUser({
      anonymousUserId: "55555555-5555-5555-5555-555555555555",
      experimentId: "vega_beachhead_v1",
      acquisition,
      isTest: false,
    });

    const attempt = await repository.createFlowAttempt({ userId: user.id, segment: "A" });

    expect(attempt.isPrimaryAttempt).toBe(true);
    expect(attempt.segment).toBe("A");
  });

  it("marca el segundo flow attempt como secundario y conserva el primario", async () => {
    const user = await repository.findOrCreateExperimentUser({
      anonymousUserId: "66666666-6666-6666-6666-666666666666",
      experimentId: "vega_beachhead_v1",
      acquisition,
      isTest: false,
    });

    const primary = await repository.createFlowAttempt({ userId: user.id, segment: "A" });
    const secondary = await repository.createFlowAttempt({ userId: user.id, segment: "B" });

    expect(secondary.isPrimaryAttempt).toBe(false);
    expect(await repository.countFlowAttemptsForUser(user.id)).toBe(2);

    const primaryFromRepo = await repository.getPrimaryFlowAttempt(user.id);
    expect(primaryFromRepo?.id).toBe(primary.id);
  });

  it("solo hay un intento primario aunque se acumulen varios intentos", async () => {
    const user = await repository.findOrCreateExperimentUser({
      anonymousUserId: "77777777-7777-7777-7777-777777777777",
      experimentId: "vega_beachhead_v1",
      acquisition,
      isTest: false,
    });

    const first = await repository.createFlowAttempt({ userId: user.id, segment: "A" });
    await repository.createFlowAttempt({ userId: user.id, segment: "B" });
    await repository.createFlowAttempt({ userId: user.id, segment: "A" });

    expect(await repository.countFlowAttemptsForUser(user.id)).toBe(3);

    const primary = await repository.getPrimaryFlowAttempt(user.id);
    expect(primary?.id).toBe(first.id);
  });
});

// Sprint 2: tablas de problem_context, user_birth_profile y partner_input.
// Las escrituras deben ser idempotentes (unique por flow_attempt_id /
// user_id en Supabase); aqui se prueba el mismo contrato sobre el driver
// en memoria.
describe("InMemoryExperimentRepository - Sprint 2", () => {
  let repository: InMemoryExperimentRepository;

  beforeEach(() => {
    repository = new InMemoryExperimentRepository();
  });

  it("upsertProblemContext reemplaza la fila existente en vez de duplicarla", async () => {
    await repository.upsertProblemContext({
      flowAttemptId: "attempt-1",
      trigger: "career",
      freeText: null,
      textProvided: false,
    });
    const updated = await repository.upsertProblemContext({
      flowAttemptId: "attempt-1",
      trigger: "career",
      freeText: "texto anadido despues",
      textProvided: true,
    });

    const stored = await repository.getProblemContextByFlowAttempt("attempt-1");
    expect(stored?.id).toBe(updated.id);
    expect(stored?.freeText).toBe("texto anadido despues");
  });

  it("upsertOwnBirthProfile reemplaza la fila existente por user_id", async () => {
    const place = {
      placeLabel: "Madrid",
      countryCode: "ES",
      latitude: 40.4168,
      longitude: -3.7038,
      timezoneId: "Europe/Madrid",
    };

    await repository.upsertOwnBirthProfile({
      userId: "user-1",
      birthDate: "1990-01-01",
      birthTime: null,
      birthTimeKnown: false,
      place,
    });
    const updated = await repository.upsertOwnBirthProfile({
      userId: "user-1",
      birthDate: "1990-01-01",
      birthTime: "10:00",
      birthTimeKnown: true,
      place,
    });

    const stored = await repository.getOwnBirthProfileByUser("user-1");
    expect(stored?.id).toBe(updated.id);
    expect(stored?.birthTimeKnown).toBe(true);
    expect(stored?.birthTime).toBe("10:00");
  });

  it("upsertPartnerInput reemplaza la fila existente por flow_attempt_id", async () => {
    await repository.upsertPartnerInput({
      flowAttemptId: "attempt-2",
      birthDate: "1988-01-01",
      birthTime: null,
      birthTimeKnown: null,
      place: null,
    });
    const updated = await repository.upsertPartnerInput({
      flowAttemptId: "attempt-2",
      birthDate: "1988-01-01",
      birthTime: null,
      birthTimeKnown: false,
      place: {
        placeLabel: "Barcelona",
        countryCode: "ES",
        latitude: 41.3874,
        longitude: 2.1686,
        timezoneId: "Europe/Madrid",
      },
    });

    const stored = await repository.getPartnerInputByFlowAttempt("attempt-2");
    expect(stored?.id).toBe(updated.id);
    expect(stored?.placeLabel).toBe("Barcelona");
  });

  // Segmento B, reduccion de retencion (VEGA_Base_Juridica_Segmento_B_v1.md,
  // condicion 3): el fallback tecnico de partner_input pasa de 24h a 1h.
  it("upsertPartnerInput sin fila previa fija expiresAt a aproximadamente 1 hora, no 24", async () => {
    const before = Date.now();
    const record = await repository.upsertPartnerInput({
      flowAttemptId: "attempt-retention-1h",
      birthDate: "1988-01-01",
      birthTime: null,
      birthTimeKnown: null,
      place: null,
    });
    const after = Date.now();

    const expiresAtMs = new Date(record.expiresAt).getTime();
    const oneHourMs = 60 * 60 * 1000;
    expect(expiresAtMs).toBeGreaterThanOrEqual(before + oneHourMs);
    expect(expiresAtMs).toBeLessThanOrEqual(after + oneHourMs);
  });

  it("upsertPartnerInput reemplazando una fila existente no renueva expiresAt", async () => {
    const original = await repository.upsertPartnerInput({
      flowAttemptId: "attempt-retention-no-renew",
      birthDate: "1988-01-01",
      birthTime: null,
      birthTimeKnown: null,
      place: null,
    });

    const updated = await repository.upsertPartnerInput({
      flowAttemptId: "attempt-retention-no-renew",
      birthDate: "1988-01-01",
      birthTime: null,
      birthTimeKnown: false,
      place: {
        placeLabel: "Barcelona",
        countryCode: "ES",
        latitude: 41.3874,
        longitude: 2.1686,
        timezoneId: "Europe/Madrid",
      },
    });

    expect(updated.expiresAt).toBe(original.expiresAt);
  });

  it("updateFlowAttemptProgress solo sobrescribe los campos indicados", async () => {
    const user = await repository.findOrCreateExperimentUser({
      anonymousUserId: "88888888-8888-8888-8888-888888888888",
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

    await repository.updateFlowAttemptProgress({ flowAttemptId: attempt.id, trigger: "career" });
    await repository.updateFlowAttemptProgress({ flowAttemptId: attempt.id, currentStep: "problem_text" });

    const updated = await repository.getFlowAttemptById(attempt.id);
    expect(updated?.trigger).toBe("career");
    expect(updated?.currentStep).toBe("problem_text");
  });
});

// Sprint 3B: cache de derivacion de sinastria (partner_derived_profile),
// borrado de partner_input y persistencia de partnerPrecision/campos de
// sinastria en previews.
describe("InMemoryExperimentRepository - Sprint 3B", () => {
  let repository: InMemoryExperimentRepository;

  beforeEach(() => {
    repository = new InMemoryExperimentRepository();
  });

  it("deletePartnerInput borra la fila y getPartnerInputByFlowAttempt devuelve null despues", async () => {
    await repository.upsertPartnerInput({
      flowAttemptId: "attempt-3",
      birthDate: "1988-01-01",
      birthTime: null,
      birthTimeKnown: null,
      place: null,
    });

    await repository.deletePartnerInput("attempt-3");

    expect(await repository.getPartnerInputByFlowAttempt("attempt-3")).toBeNull();
  });

  it("deletePartnerInput no lanza si la fila no existe (idempotente)", async () => {
    await expect(repository.deletePartnerInput("attempt-inexistente")).resolves.toBeUndefined();
  });

  it("upsertPartnerDerivedProfile reemplaza la fila existente por flow_attempt_id", async () => {
    await repository.upsertPartnerDerivedProfile({
      flowAttemptId: "attempt-4",
      partnerPrecision: "minimal",
      derivedFeatures: { status: "insufficient_data", reason: "participant_minimal", insufficientParticipants: ["b"] },
    });
    const updated = await repository.upsertPartnerDerivedProfile({
      flowAttemptId: "attempt-4",
      partnerPrecision: "full",
      derivedFeatures: {
        status: "ok",
        chartIdA: "chart-a",
        chartIdB: "chart-b",
        versions: { facts: "facts_v1", synastryFacts: "syn_facts_v1", synastryClaims: "syn_claims_v1", synastryEvidenceSchema: "syn_evidence_v1" },
        timeContext: { timeKnownA: true, timeKnownB: true },
        precision: { a: "full", b: "full" },
        allowedEvidence: [],
      },
    });

    const stored = await repository.getPartnerDerivedProfileByFlowAttempt("attempt-4");
    expect(stored?.id).toBe(updated.id);
    expect(stored?.partnerPrecision).toBe("full");
    expect(stored?.derivedFeatures.status).toBe("ok");
  });

  // Revision de seguridad 2026-10-07 (VEGA_Base_Juridica_Segmento_B_v1.md):
  // delete_after <= now() debe tratarse como inexistente/no reutilizable.
  // La API publica nunca produce una fila ya caducada (upsert siempre
  // fija deleteAfter en el futuro), asi que para ejercer el camino de
  // lectura defensivo se inyecta directamente el estado interno via un
  // cast -- "private" en TypeScript es solo una restriccion de
  // compilacion, no de runtime.
  function seedExpiredDerivedProfile(
    targetRepository: InMemoryExperimentRepository,
    flowAttemptId: string,
    deleteAfter: string,
    derivedFeatures: PartnerDerivedFeatures
  ): void {
    const internals = targetRepository as unknown as {
      partnerDerivedProfileByFlowAttempt: Map<string, PartnerDerivedProfileRecord>;
    };
    internals.partnerDerivedProfileByFlowAttempt.set(flowAttemptId, {
      id: crypto.randomUUID(),
      flowAttemptId,
      partnerPrecision: "full",
      derivedFeatures,
      createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      deleteAfter,
    });
  }

  it("getPartnerDerivedProfileByFlowAttempt devuelve la fila si deleteAfter esta en el futuro (vigente)", async () => {
    seedExpiredDerivedProfile(
      repository,
      "attempt-vigente",
      new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      { status: "insufficient_data", reason: "participant_minimal", insufficientParticipants: ["b"] }
    );

    const result = await repository.getPartnerDerivedProfileByFlowAttempt("attempt-vigente");
    expect(result).not.toBeNull();
  });

  it("getPartnerDerivedProfileByFlowAttempt trata deleteAfter == now (o anterior) como caducado", async () => {
    seedExpiredDerivedProfile(
      repository,
      "attempt-justo-caducado",
      new Date().toISOString(),
      { status: "insufficient_data", reason: "participant_minimal", insufficientParticipants: ["b"] }
    );

    const result = await repository.getPartnerDerivedProfileByFlowAttempt("attempt-justo-caducado");
    expect(result).toBeNull();
  });

  it("getPartnerDerivedProfileByFlowAttempt no reutiliza un status:'ok' caducado", async () => {
    seedExpiredDerivedProfile(
      repository,
      "attempt-ok-caducado",
      new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      {
        status: "ok",
        chartIdA: "chart-a",
        chartIdB: "chart-b",
        versions: { facts: "facts_v1", synastryFacts: "syn_facts_v1", synastryClaims: "syn_claims_v1", synastryEvidenceSchema: "syn_evidence_v1" },
        timeContext: { timeKnownA: true, timeKnownB: true },
        precision: { a: "full", b: "full" },
        allowedEvidence: [],
      }
    );

    const result = await repository.getPartnerDerivedProfileByFlowAttempt("attempt-ok-caducado");
    expect(result).toBeNull();
  });

  it("getPartnerDerivedProfileByFlowAttempt no reutiliza un status:'insufficient_data' caducado", async () => {
    seedExpiredDerivedProfile(
      repository,
      "attempt-insuficiente-caducado",
      new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      { status: "insufficient_data", reason: "insufficient_evidence", insufficientParticipants: [] }
    );

    const result = await repository.getPartnerDerivedProfileByFlowAttempt("attempt-insuficiente-caducado");
    expect(result).toBeNull();
  });

  // Segmento B, reduccion de retencion (VEGA_Base_Juridica_Segmento_B_v1.md,
  // condicion 3): partner_derived_profile pasa de 30 dias a 24 horas,
  // formulado como continuidad/reintentos de corto plazo.
  it("upsertPartnerDerivedProfile sin fila previa fija deleteAfter a aproximadamente 24 horas, no 30 dias", async () => {
    const before = Date.now();
    const record = await repository.upsertPartnerDerivedProfile({
      flowAttemptId: "attempt-retention-24h",
      partnerPrecision: "minimal",
      derivedFeatures: { status: "insufficient_data", reason: "participant_minimal", insufficientParticipants: ["b"] },
    });
    const after = Date.now();

    const deleteAfterMs = new Date(record.deleteAfter).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    expect(deleteAfterMs).toBeGreaterThanOrEqual(before + oneDayMs);
    expect(deleteAfterMs).toBeLessThanOrEqual(after + oneDayMs);
  });

  it("upsertPartnerDerivedProfile reemplazando una fila existente no renueva deleteAfter", async () => {
    const original = await repository.upsertPartnerDerivedProfile({
      flowAttemptId: "attempt-retention-24h-no-renew",
      partnerPrecision: "minimal",
      derivedFeatures: { status: "insufficient_data", reason: "participant_minimal", insufficientParticipants: ["b"] },
    });

    const updated = await repository.upsertPartnerDerivedProfile({
      flowAttemptId: "attempt-retention-24h-no-renew",
      partnerPrecision: "full",
      derivedFeatures: {
        status: "ok",
        chartIdA: "chart-a",
        chartIdB: "chart-b",
        versions: { facts: "facts_v1", synastryFacts: "syn_facts_v1", synastryClaims: "syn_claims_v1", synastryEvidenceSchema: "syn_evidence_v1" },
        timeContext: { timeKnownA: true, timeKnownB: true },
        precision: { a: "full", b: "full" },
        allowedEvidence: [],
      },
    });

    expect(updated.deleteAfter).toBe(original.deleteAfter);
  });

  it("deletePartnerDerivedProfile invalida el cache de derivacion", async () => {
    await repository.upsertPartnerDerivedProfile({
      flowAttemptId: "attempt-5",
      partnerPrecision: "minimal",
      derivedFeatures: { status: "insufficient_data", reason: "participant_minimal", insufficientParticipants: ["b"] },
    });

    await repository.deletePartnerDerivedProfile("attempt-5");

    expect(await repository.getPartnerDerivedProfileByFlowAttempt("attempt-5")).toBeNull();
  });

  it("createPreview persiste partnerPrecision y los campos de sinastria (chartIdB, timeKnownB, versiones syn_*)", async () => {
    const record = await repository.createPreview({
      flowAttemptId: "attempt-6",
      schemaVersion: "preview_v1",
      promptVersion: "preview_prompt_b_v1",
      modelId: "test-model",
      partnerPrecision: "full",
      chartId: "chart-a",
      evidenceSchemaVersion: null,
      factsVersion: null,
      claimsVersion: null,
      timeKnown: true,
      chartIdB: "chart-b",
      synastryFactsVersion: "syn_facts_v1",
      synastryClaimsVersion: "syn_claims_v1",
      synastryEvidenceSchemaVersion: "syn_evidence_v1",
      timeKnownB: true,
      evidenceIdsUsed: ["ev_ab_001", "ev_ab_002"],
      preview: null,
      generationStatus: "valid",
      errorType: null,
      latencyMs: 5,
    });

    expect(record.partnerPrecision).toBe("full");
    expect(record.chartIdB).toBe("chart-b");
    expect(record.synastryFactsVersion).toBe("syn_facts_v1");
    expect(record.timeKnownB).toBe(true);
  });

  it("createPreview acepta generationStatus='insufficient_data'", async () => {
    const record = await repository.createPreview({
      flowAttemptId: "attempt-7",
      schemaVersion: "preview_v1",
      promptVersion: "preview_prompt_b_v1",
      modelId: null,
      partnerPrecision: "minimal",
      chartId: null,
      evidenceSchemaVersion: null,
      factsVersion: null,
      claimsVersion: null,
      timeKnown: null,
      evidenceIdsUsed: [],
      preview: null,
      generationStatus: "insufficient_data",
      errorType: null,
      latencyMs: null,
    });

    expect(record.generationStatus).toBe("insufficient_data");
  });
});

// Sprint 4: intencion de pago confirmada (priced_access_intents) y
// waitlist, ambas "if-not-exists" por flow_attempt_id (idempotencia:
// wasNew distingue el primer insert de un reintento/doble clic).
describe("InMemoryExperimentRepository - Sprint 4", () => {
  let repository: InMemoryExperimentRepository;

  beforeEach(() => {
    repository = new InMemoryExperimentRepository();
  });

  it("createPricedAccessIntentIfNotExists crea la fila la primera vez (wasNew=true)", async () => {
    const result = await repository.createPricedAccessIntentIfNotExists({
      flowAttemptId: "attempt-paywall-1",
      priceMinor: 999,
      currency: "EUR",
    });

    expect(result.wasNew).toBe(true);
    expect(result.record.flowAttemptId).toBe("attempt-paywall-1");
    expect(result.record.priceMinor).toBe(999);
    expect(result.record.currency).toBe("EUR");
  });

  it("createPricedAccessIntentIfNotExists devuelve la misma fila en un segundo intento (wasNew=false)", async () => {
    const first = await repository.createPricedAccessIntentIfNotExists({
      flowAttemptId: "attempt-paywall-2",
      priceMinor: 999,
      currency: "EUR",
    });
    const second = await repository.createPricedAccessIntentIfNotExists({
      flowAttemptId: "attempt-paywall-2",
      priceMinor: 999,
      currency: "EUR",
    });

    expect(second.wasNew).toBe(false);
    expect(second.record.id).toBe(first.record.id);
  });

  it("getPricedAccessIntentByFlowAttempt devuelve null si no existe", async () => {
    expect(await repository.getPricedAccessIntentByFlowAttempt("attempt-inexistente")).toBeNull();
  });

  it("createWaitlistEntryIfNotExists crea la fila la primera vez (wasNew=true), status pending", async () => {
    const result = await repository.createWaitlistEntryIfNotExists({
      flowAttemptId: "attempt-waitlist-1",
      email: "usuario@example.com",
      consentVersion: "waitlist_consent_v1",
    });

    expect(result.wasNew).toBe(true);
    expect(result.record.email).toBe("usuario@example.com");
    expect(result.record.confirmationStatus).toBe("pending");
  });

  it("createWaitlistEntryIfNotExists devuelve la misma fila en un segundo intento (wasNew=false), sin sobrescribir el email", async () => {
    const first = await repository.createWaitlistEntryIfNotExists({
      flowAttemptId: "attempt-waitlist-2",
      email: "primero@example.com",
      consentVersion: "waitlist_consent_v1",
    });
    const second = await repository.createWaitlistEntryIfNotExists({
      flowAttemptId: "attempt-waitlist-2",
      email: "segundo@example.com",
      consentVersion: "waitlist_consent_v1",
    });

    expect(second.wasNew).toBe(false);
    expect(second.record.id).toBe(first.record.id);
    expect(second.record.email).toBe("primero@example.com");
  });

  it("getWaitlistEntryByFlowAttempt devuelve null si no existe", async () => {
    expect(await repository.getWaitlistEntryByFlowAttempt("attempt-inexistente")).toBeNull();
  });
});
