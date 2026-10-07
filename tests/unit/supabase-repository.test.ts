import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { SupabaseExperimentRepository } from "@/libs/db/supabase-repository";
import type { PartnerDerivedFeatures } from "@/libs/db/types";
import { UniqueConstraintViolationError } from "@/libs/db/types";

// Mock minimo del builder encadenable de supabase-js. from/insert/
// update/select/eq devuelven el propio objeto (encadenables); single/
// maybeSingle devuelven promesas propias configurables por test; el
// objeto tambien es "thenable" (implementa .then) para el caso de
// count-only (select(..., {count, head:true}).eq(...)) que se awaitea
// sin llamar a single()/maybeSingle().
interface FakeChain {
  from: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then: (resolve: (value: unknown) => unknown) => Promise<unknown>;
  thenResult: { data: unknown; error: unknown; count?: number | null };
}

function createFakeChain(thenResult: { data?: unknown; error?: unknown; count?: number | null }): FakeChain {
  const chain = {} as FakeChain;
  chain.thenResult = { data: thenResult.data ?? null, error: thenResult.error ?? null, count: thenResult.count };
  chain.from = vi.fn(() => chain);
  chain.insert = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.upsert = vi.fn(() => chain);
  chain.delete = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.gt = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(chain.thenResult));
  chain.maybeSingle = vi.fn(() => Promise.resolve(chain.thenResult));
  chain.then = (resolve) => Promise.resolve(chain.thenResult).then(resolve);
  return chain;
}

const rowFixture = {
  id: "user-row-1",
  anonymous_user_id: "11111111-1111-1111-1111-111111111111",
  experiment_id: "vega_beachhead_v1",
  first_seen_at: "2026-01-01T00:00:00.000Z",
  last_seen_at: "2026-01-01T00:00:00.000Z",
  traffic_source: "meta",
  utm_source: "meta",
  utm_medium: "paid_social",
  utm_campaign: "vega_beachhead_v1_es",
  utm_content: "neutral_v1",
  placement: "instagram_feed",
  device_type: "mobile",
  is_test: false,
};

describe("SupabaseExperimentRepository", () => {
  it("mapea una fila de experiment_users a camelCase", async () => {
    const chain = createFakeChain({ data: rowFixture, error: null });
    const repository = new SupabaseExperimentRepository(chain as unknown as SupabaseClient);

    const user = await repository.getExperimentUserByAnonymousId(rowFixture.anonymous_user_id);

    expect(user).toEqual({
      id: "user-row-1",
      anonymousUserId: rowFixture.anonymous_user_id,
      experimentId: "vega_beachhead_v1",
      firstSeenAt: rowFixture.first_seen_at,
      lastSeenAt: rowFixture.last_seen_at,
      isTest: false,
      acquisition: {
        trafficSource: "meta",
        utmSource: "meta",
        utmMedium: "paid_social",
        utmCampaign: "vega_beachhead_v1_es",
        utmContent: "neutral_v1",
        placement: "instagram_feed",
        deviceType: "mobile",
      },
    });
  });

  it("devuelve null cuando no existe el usuario", async () => {
    const chain = createFakeChain({ data: null, error: null });
    const repository = new SupabaseExperimentRepository(chain as unknown as SupabaseClient);

    const user = await repository.getExperimentUserByAnonymousId("no-existe");
    expect(user).toBeNull();
  });

  it("crea un experiment_users nuevo enviando el payload en snake_case", async () => {
    const chain = createFakeChain({ data: null, error: null });
    // getExperimentUserByAnonymousId (maybeSingle) -> no existe.
    // insert().select().single() -> fila creada.
    chain.single = vi.fn(() => Promise.resolve({ data: rowFixture, error: null }));

    const repository = new SupabaseExperimentRepository(chain as unknown as SupabaseClient);

    const created = await repository.findOrCreateExperimentUser({
      anonymousUserId: rowFixture.anonymous_user_id,
      experimentId: "vega_beachhead_v1",
      acquisition: {
        trafficSource: "meta",
        utmSource: "meta",
        utmMedium: "paid_social",
        utmCampaign: "vega_beachhead_v1_es",
        utmContent: "neutral_v1",
        placement: "instagram_feed",
        deviceType: "mobile",
      },
      isTest: false,
    });

    expect(created.id).toBe("user-row-1");
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        anonymous_user_id: rowFixture.anonymous_user_id,
        utm_source: "meta",
        is_test: false,
      })
    );
  });

  it("recupera el usuario ganador de la carrera ante una violacion de unicidad (23505)", async () => {
    const chain = createFakeChain({});
    chain.maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: rowFixture, error: null });
    chain.single = vi.fn(() =>
      Promise.resolve({ data: null, error: { code: "23505", message: "duplicate key" } })
    );

    const repository = new SupabaseExperimentRepository(chain as unknown as SupabaseClient);

    const result = await repository.findOrCreateExperimentUser({
      anonymousUserId: rowFixture.anonymous_user_id,
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

    expect(result.id).toBe("user-row-1");
    expect(chain.maybeSingle).toHaveBeenCalledTimes(2);
  });

  it("lanza UniqueConstraintViolationError si flow_attempts viola only_one_primary_attempt", async () => {
    const chain = createFakeChain({ count: 0, error: null });
    chain.single = vi.fn(() =>
      Promise.resolve({ data: null, error: { code: "23505", message: "duplicate key" } })
    );

    const repository = new SupabaseExperimentRepository(chain as unknown as SupabaseClient);

    await expect(
      repository.createFlowAttempt({ userId: "user-row-1", segment: "A" })
    ).rejects.toThrow(UniqueConstraintViolationError);
  });

  it("mapea un flow_attempt creado correctamente", async () => {
    const flowRow: {
      id: string;
      user_id: string;
      segment: string;
      trigger: string | null;
      current_step: string | null;
      partner_precision: string | null;
      is_primary_attempt: boolean;
      started_at: string;
      completed_at: string | null;
    } = {
      id: "attempt-1",
      user_id: "user-row-1",
      segment: "A",
      trigger: null,
      current_step: null,
      partner_precision: null,
      is_primary_attempt: true,
      started_at: "2026-01-01T00:00:00.000Z",
      completed_at: null,
    };

    const chain = createFakeChain({ count: 0, error: null });
    chain.single = vi.fn(() => Promise.resolve({ data: flowRow, error: null }));

    const repository = new SupabaseExperimentRepository(chain as unknown as SupabaseClient);
    const attempt = await repository.createFlowAttempt({ userId: "user-row-1", segment: "A" });

    expect(attempt.isPrimaryAttempt).toBe(true);
    expect(attempt.segment).toBe("A");
    expect(attempt.id).toBe("attempt-1");
  });

  it("upsertProblemContext usa onConflict:flow_attempt_id y mapea la fila resultante", async () => {
    const row = {
      id: "problem-1",
      flow_attempt_id: "attempt-1",
      trigger: "career",
      free_text: "texto",
      text_provided: true,
      created_at: "2026-01-01T00:00:00.000Z",
    };
    const chain = createFakeChain({});
    chain.single = vi.fn(() => Promise.resolve({ data: row, error: null }));

    const repository = new SupabaseExperimentRepository(chain as unknown as SupabaseClient);
    const result = await repository.upsertProblemContext({
      flowAttemptId: "attempt-1",
      trigger: "career",
      freeText: "texto",
      textProvided: true,
    });

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ flow_attempt_id: "attempt-1", trigger: "career" }),
      { onConflict: "flow_attempt_id" }
    );
    expect(result.id).toBe("problem-1");
    expect(result.freeText).toBe("texto");
  });

  it("upsertOwnBirthProfile usa onConflict:user_id y mapea la fila resultante", async () => {
    const row: {
      id: string;
      user_id: string;
      birth_date: string;
      birth_time: string | null;
      birth_time_known: boolean;
      place_label: string;
      country_code: string;
      latitude: number;
      longitude: number;
      timezone_id: string;
      created_at: string;
      updated_at: string;
    } = {
      id: "profile-1",
      user_id: "user-1",
      birth_date: "1990-01-01",
      birth_time: null,
      birth_time_known: false,
      place_label: "Madrid",
      country_code: "ES",
      latitude: 40.4168,
      longitude: -3.7038,
      timezone_id: "Europe/Madrid",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };
    const chain = createFakeChain({});
    chain.single = vi.fn(() => Promise.resolve({ data: row, error: null }));

    const repository = new SupabaseExperimentRepository(chain as unknown as SupabaseClient);
    const result = await repository.upsertOwnBirthProfile({
      userId: "user-1",
      birthDate: "1990-01-01",
      birthTime: null,
      birthTimeKnown: false,
      place: {
        placeLabel: "Madrid",
        countryCode: "ES",
        latitude: 40.4168,
        longitude: -3.7038,
        timezoneId: "Europe/Madrid",
      },
    });

    expect(chain.upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "user-1" }), {
      onConflict: "user_id",
    });
    expect(result.placeLabel).toBe("Madrid");
    expect(result.timezoneId).toBe("Europe/Madrid");
  });

  it("upsertPartnerInput usa onConflict:flow_attempt_id y admite lugar nulo (minimal)", async () => {
    const row: {
      id: string;
      flow_attempt_id: string;
      birth_date: string;
      birth_time: string | null;
      birth_time_known: boolean | null;
      place_label: string | null;
      country_code: string | null;
      latitude: number | null;
      longitude: number | null;
      timezone_id: string | null;
      created_at: string;
      expires_at: string;
    } = {
      id: "partner-1",
      flow_attempt_id: "attempt-2",
      birth_date: "1988-01-01",
      birth_time: null,
      birth_time_known: null,
      place_label: null,
      country_code: null,
      latitude: null,
      longitude: null,
      timezone_id: null,
      created_at: "2026-01-01T00:00:00.000Z",
      expires_at: "2026-01-02T00:00:00.000Z",
    };
    const chain = createFakeChain({});
    chain.single = vi.fn(() => Promise.resolve({ data: row, error: null }));

    const repository = new SupabaseExperimentRepository(chain as unknown as SupabaseClient);
    const result = await repository.upsertPartnerInput({
      flowAttemptId: "attempt-2",
      birthDate: "1988-01-01",
      birthTime: null,
      birthTimeKnown: null,
      place: null,
    });

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ flow_attempt_id: "attempt-2", place_label: null }),
      { onConflict: "flow_attempt_id" }
    );
    expect(result.placeLabel).toBeNull();
  });

  it("updateFlowAttemptProgress solo incluye en el patch los campos definidos", async () => {
    const row: {
      id: string;
      user_id: string;
      segment: string;
      trigger: string | null;
      current_step: string | null;
      partner_precision: string | null;
      is_primary_attempt: boolean;
      started_at: string;
      completed_at: string | null;
    } = {
      id: "attempt-1",
      user_id: "user-1",
      segment: "A",
      trigger: "career",
      current_step: "problem_text",
      partner_precision: null,
      is_primary_attempt: true,
      started_at: "2026-01-01T00:00:00.000Z",
      completed_at: null,
    };
    const chain = createFakeChain({});
    chain.single = vi.fn(() => Promise.resolve({ data: row, error: null }));

    const repository = new SupabaseExperimentRepository(chain as unknown as SupabaseClient);
    const result = await repository.updateFlowAttemptProgress({
      flowAttemptId: "attempt-1",
      trigger: "career",
      currentStep: "problem_text",
    });

    expect(chain.update).toHaveBeenCalledWith({ trigger: "career", current_step: "problem_text" });
    expect(result.currentStep).toBe("problem_text");
  });

  it("deletePartnerInput llama a delete().eq(flow_attempt_id)", async () => {
    const chain = createFakeChain({ error: null });
    const repository = new SupabaseExperimentRepository(chain as unknown as SupabaseClient);

    await repository.deletePartnerInput("attempt-2");

    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("flow_attempt_id", "attempt-2");
  });

  it("deletePartnerInput lanza si Supabase devuelve un error", async () => {
    const chain = createFakeChain({ error: { message: "boom" } });
    const repository = new SupabaseExperimentRepository(chain as unknown as SupabaseClient);

    await expect(repository.deletePartnerInput("attempt-2")).rejects.toThrow(/partner_input/);
  });

  it("upsertPartnerDerivedProfile usa onConflict:flow_attempt_id y mapea derived_features", async () => {
    const row: {
      id: string;
      flow_attempt_id: string;
      partner_precision: string;
      derived_features: PartnerDerivedFeatures;
      created_at: string;
      delete_after: string;
    } = {
      id: "derived-1",
      flow_attempt_id: "attempt-3",
      partner_precision: "full",
      derived_features: {
        status: "ok",
        chartIdA: "chart-a",
        chartIdB: "chart-b",
        versions: { facts: "facts_v1", synastryFacts: "syn_facts_v1", synastryClaims: "syn_claims_v1", synastryEvidenceSchema: "syn_evidence_v1" },
        timeContext: { timeKnownA: true, timeKnownB: true },
        precision: { a: "full", b: "full" },
        allowedEvidence: [],
      },
      created_at: "2026-01-01T00:00:00.000Z",
      delete_after: "2026-01-31T00:00:00.000Z",
    };
    const chain = createFakeChain({});
    chain.single = vi.fn(() => Promise.resolve({ data: row, error: null }));

    const repository = new SupabaseExperimentRepository(chain as unknown as SupabaseClient);
    const result = await repository.upsertPartnerDerivedProfile({
      flowAttemptId: "attempt-3",
      partnerPrecision: "full",
      derivedFeatures: row.derived_features,
    });

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ flow_attempt_id: "attempt-3", partner_precision: "full", synastry_status: "ok" }),
      { onConflict: "flow_attempt_id" }
    );
    expect(result.id).toBe("derived-1");
    expect(result.derivedFeatures.status).toBe("ok");
  });

  it("getPartnerDerivedProfileByFlowAttempt devuelve null cuando no hay fila", async () => {
    const chain = createFakeChain({ data: null, error: null });
    const repository = new SupabaseExperimentRepository(chain as unknown as SupabaseClient);

    const result = await repository.getPartnerDerivedProfileByFlowAttempt("attempt-desconocido");
    expect(result).toBeNull();
  });

  // Revision de seguridad 2026-10-07 (VEGA_Base_Juridica_Segmento_B_v1.md):
  // delete_after <= now() debe tratarse como inexistente, con
  // independencia de si el cron de purga ya paso por la fila. El filtro
  // se aplica en la propia consulta (gt sobre delete_after), no en el
  // cliente despues de recibir la fila.
  it("getPartnerDerivedProfileByFlowAttempt filtra por delete_after > now() en la propia consulta", async () => {
    const before = Date.now();
    const chain = createFakeChain({ data: null, error: null });
    const repository = new SupabaseExperimentRepository(chain as unknown as SupabaseClient);

    await repository.getPartnerDerivedProfileByFlowAttempt("attempt-3");

    expect(chain.eq).toHaveBeenCalledWith("flow_attempt_id", "attempt-3");
    expect(chain.gt).toHaveBeenCalledTimes(1);
    const [column, isoValue] = chain.gt.mock.calls[0] as [string, string];
    expect(column).toBe("delete_after");
    expect(new Date(isoValue).getTime()).toBeGreaterThanOrEqual(before);
    expect(new Date(isoValue).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("deletePartnerDerivedProfile llama a delete().eq(flow_attempt_id)", async () => {
    const chain = createFakeChain({ error: null });
    const repository = new SupabaseExperimentRepository(chain as unknown as SupabaseClient);

    await repository.deletePartnerDerivedProfile("attempt-3");

    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("flow_attempt_id", "attempt-3");
  });

  it("createPreview envia partner_precision y las columnas de sinastria (chart_id_b, time_known_b, syn_*)", async () => {
    const row: {
      id: string;
      flow_attempt_id: string;
      schema_version: string;
      prompt_version: string;
      model_id: string | null;
      partner_precision: string | null;
      chart_id: string | null;
      evidence_schema_version: string | null;
      facts_version: string | null;
      claims_version: string | null;
      time_known: boolean | null;
      chart_id_b: string | null;
      synastry_facts_version: string | null;
      synastry_claims_version: string | null;
      synastry_evidence_schema_version: string | null;
      time_known_b: boolean | null;
      evidence_ids_used: string[];
      preview_json: null;
      generation_status: "valid" | "invalid" | "error" | "insufficient_data";
      error_type: string | null;
      latency_ms: number | null;
      created_at: string;
    } = {
      id: "preview-1",
      flow_attempt_id: "attempt-4",
      schema_version: "preview_v1",
      prompt_version: "preview_prompt_b_v1",
      model_id: "test-model",
      partner_precision: "full",
      chart_id: "chart-a",
      evidence_schema_version: null,
      facts_version: null,
      claims_version: null,
      time_known: true,
      chart_id_b: "chart-b",
      synastry_facts_version: "syn_facts_v1",
      synastry_claims_version: "syn_claims_v1",
      synastry_evidence_schema_version: "syn_evidence_v1",
      time_known_b: true,
      evidence_ids_used: ["ev_ab_001", "ev_ab_002"],
      preview_json: null,
      generation_status: "valid",
      error_type: null,
      latency_ms: 5,
      created_at: "2026-01-01T00:00:00.000Z",
    };
    const chain = createFakeChain({});
    chain.single = vi.fn(() => Promise.resolve({ data: row, error: null }));

    const repository = new SupabaseExperimentRepository(chain as unknown as SupabaseClient);
    const result = await repository.createPreview({
      flowAttemptId: "attempt-4",
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

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        partner_precision: "full",
        chart_id_b: "chart-b",
        synastry_facts_version: "syn_facts_v1",
        time_known_b: true,
      })
    );
    expect(result.chartIdB).toBe("chart-b");
    expect(result.timeKnownB).toBe(true);
  });

  // Sprint 4: priced_access_intents / waitlist, ambas "if-not-exists" por
  // flow_attempt_id -- insert directo la primera vez, y ante un conflicto
  // (23505) se recupera la fila ya existente en vez de fallar.
  it("createPricedAccessIntentIfNotExists inserta y mapea la fila (wasNew=true)", async () => {
    const row = {
      id: "intent-1",
      flow_attempt_id: "attempt-10",
      price_minor: 999,
      currency: "EUR",
      created_at: "2026-01-01T00:00:00.000Z",
    };
    const chain = createFakeChain({});
    chain.single = vi.fn(() => Promise.resolve({ data: row, error: null }));

    const repository = new SupabaseExperimentRepository(chain as unknown as SupabaseClient);
    const result = await repository.createPricedAccessIntentIfNotExists({
      flowAttemptId: "attempt-10",
      priceMinor: 999,
      currency: "EUR",
    });

    expect(chain.insert).toHaveBeenCalledWith({
      flow_attempt_id: "attempt-10",
      price_minor: 999,
      currency: "EUR",
    });
    expect(result.wasNew).toBe(true);
    expect(result.record.id).toBe("intent-1");
  });

  it("createPricedAccessIntentIfNotExists recupera la fila existente ante 23505 (wasNew=false)", async () => {
    const row = {
      id: "intent-2",
      flow_attempt_id: "attempt-11",
      price_minor: 999,
      currency: "EUR",
      created_at: "2026-01-01T00:00:00.000Z",
    };
    const chain = createFakeChain({});
    chain.single = vi.fn(() => Promise.resolve({ data: null, error: { code: "23505", message: "duplicate key" } }));
    chain.maybeSingle = vi.fn(() => Promise.resolve({ data: row, error: null }));

    const repository = new SupabaseExperimentRepository(chain as unknown as SupabaseClient);
    const result = await repository.createPricedAccessIntentIfNotExists({
      flowAttemptId: "attempt-11",
      priceMinor: 999,
      currency: "EUR",
    });

    expect(result.wasNew).toBe(false);
    expect(result.record.id).toBe("intent-2");
  });

  it("getPricedAccessIntentByFlowAttempt devuelve null cuando no hay fila", async () => {
    const chain = createFakeChain({ data: null, error: null });
    const repository = new SupabaseExperimentRepository(chain as unknown as SupabaseClient);

    expect(await repository.getPricedAccessIntentByFlowAttempt("attempt-inexistente")).toBeNull();
  });

  it("createWaitlistEntryIfNotExists inserta y mapea la fila (wasNew=true)", async () => {
    const row = {
      id: "waitlist-1",
      flow_attempt_id: "attempt-20",
      email: "usuario@example.com",
      consent_version: "waitlist_consent_v1",
      confirmation_status: "pending" as const,
      created_at: "2026-01-01T00:00:00.000Z",
    };
    const chain = createFakeChain({});
    chain.single = vi.fn(() => Promise.resolve({ data: row, error: null }));

    const repository = new SupabaseExperimentRepository(chain as unknown as SupabaseClient);
    const result = await repository.createWaitlistEntryIfNotExists({
      flowAttemptId: "attempt-20",
      email: "usuario@example.com",
      consentVersion: "waitlist_consent_v1",
    });

    expect(chain.insert).toHaveBeenCalledWith({
      flow_attempt_id: "attempt-20",
      email: "usuario@example.com",
      consent_version: "waitlist_consent_v1",
    });
    expect(result.wasNew).toBe(true);
    expect(result.record.confirmationStatus).toBe("pending");
  });

  it("createWaitlistEntryIfNotExists recupera la fila existente ante 23505 (wasNew=false)", async () => {
    const row = {
      id: "waitlist-2",
      flow_attempt_id: "attempt-21",
      email: "primero@example.com",
      consent_version: "waitlist_consent_v1",
      confirmation_status: "pending" as const,
      created_at: "2026-01-01T00:00:00.000Z",
    };
    const chain = createFakeChain({});
    chain.single = vi.fn(() => Promise.resolve({ data: null, error: { code: "23505", message: "duplicate key" } }));
    chain.maybeSingle = vi.fn(() => Promise.resolve({ data: row, error: null }));

    const repository = new SupabaseExperimentRepository(chain as unknown as SupabaseClient);
    const result = await repository.createWaitlistEntryIfNotExists({
      flowAttemptId: "attempt-21",
      email: "segundo@example.com",
      consentVersion: "waitlist_consent_v1",
    });

    expect(result.wasNew).toBe(false);
    expect(result.record.email).toBe("primero@example.com");
  });

  it("getWaitlistEntryByFlowAttempt devuelve null cuando no hay fila", async () => {
    const chain = createFakeChain({ data: null, error: null });
    const repository = new SupabaseExperimentRepository(chain as unknown as SupabaseClient);

    expect(await repository.getWaitlistEntryByFlowAttempt("attempt-inexistente")).toBeNull();
  });
});
