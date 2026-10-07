import { describe, expect, it } from "vitest";

import { validateVegaSynastryPayload } from "@/libs/vega/synastry-client";

function synEvidenceAt(payload: Record<string, unknown>, index: number): Record<string, unknown> {
  const evidence = payload.allowed_evidence as Record<string, unknown>[];
  const item = evidence[index];
  if (!item) throw new Error(`allowed_evidence[${index}] no existe en el payload de prueba`);
  return item;
}

function evidenceItem(
  personABody: string,
  personBBody: string,
  aspectType: string,
  fullFull: boolean,
  overrides: Record<string, unknown> = {}
) {
  const id = `syn_evidence_v1:syn_facts_v1:syn_claims_v1:facts_v1:chart-a:chart-b:inter_aspect:${personABody}:${personBBody}:${aspectType}`;
  return {
    id,
    syn_evidence_schema_version: "syn_evidence_v1",
    syn_facts_version: "syn_facts_v1",
    syn_claims_version: "syn_claims_v1",
    facts_version: "facts_v1",
    chart_id_a: "chart-a",
    chart_id_b: "chart-b",
    kind: "inter_chart_aspect",
    subject: { person_a_body: personABody, person_b_body: personBBody },
    payload: fullFull
      ? { type: aspectType, toca_luminaria: false, toca_angulo: false, orbe_max: 8, orbe: 1.2, fuerza: 0.7, exacto: false }
      : { type: aspectType, toca_luminaria: false, toca_angulo: false, orbe_max: 8 },
    provenance: { source: "synastry_structural_claim" },
    ...overrides,
  };
}

function buildValidPayload(overrides: Record<string, unknown> = {}) {
  return {
    status: "ok",
    request_id: "req-1",
    chart_id_a: "chart-a",
    chart_id_b: "chart-b",
    versions: {
      facts: "facts_v1",
      synastry_facts: "syn_facts_v1",
      synastry_claims: "syn_claims_v1",
      synastry_evidence_schema: "syn_evidence_v1",
    },
    time_context: { time_known_a: true, time_known_b: true },
    precision: { a: "full", b: "full" },
    allowed_evidence: [
      evidenceItem("sun", "moon", "trigono", true),
      evidenceItem("venus", "mars", "conjuncion", true),
    ],
    ...overrides,
  };
}

describe("validateVegaSynastryPayload", () => {
  it("acepta una respuesta valida full/full con orbe/fuerza/exacto", () => {
    const result = validateVegaSynastryPayload(buildValidPayload());
    expect(result.ok).toBe(true);
    if (result.ok && result.data.status === "ok") {
      expect(result.data.chartIdA).toBe("chart-a");
      expect(result.data.allowedEvidence).toHaveLength(2);
      expect(result.data.allowedEvidence[0]?.payload.orbe).toBe(1.2);
    }
  });

  it("acepta full/partial sin orbe/fuerza/exacto en el payload", () => {
    const payload = buildValidPayload({
      time_context: { time_known_a: true, time_known_b: false },
      precision: { a: "full", b: "partial" },
      allowed_evidence: [
        evidenceItem("sun", "moon", "trigono", false),
        evidenceItem("venus", "mars", "conjuncion", false),
      ],
    });
    const result = validateVegaSynastryPayload(payload);
    expect(result.ok).toBe(true);
  });

  it("acepta partial/partial", () => {
    const payload = buildValidPayload({
      time_context: { time_known_a: false, time_known_b: false },
      precision: { a: "partial", b: "partial" },
      allowed_evidence: [
        evidenceItem("sun", "moon", "trigono", false),
        evidenceItem("venus", "mars", "conjuncion", false),
      ],
    });
    const result = validateVegaSynastryPayload(payload);
    expect(result.ok).toBe(true);
  });

  it("acepta insufficient_data como resultado de dominio, no como error", () => {
    const result = validateVegaSynastryPayload({
      status: "insufficient_data",
      request_id: "req-2",
      insufficient_participants: ["b"],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe("insufficient_data");
      if (result.data.status === "insufficient_data") {
        expect(result.data.insufficientParticipants).toEqual(["b"]);
      }
    }
  });

  it("rechaza insufficient_participants vacio (schema invalido)", () => {
    const result = validateVegaSynastryPayload({
      status: "insufficient_data",
      request_id: "req-2",
      insufficient_participants: [],
    });
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.errorType).toBe("invalid_schema");
  });

  it("rechaza precision='minimal' dentro de un status=ok", () => {
    const payload = buildValidPayload({ precision: { a: "minimal", b: "full" } });
    const result = validateVegaSynastryPayload(payload);
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.errorType).toBe("invalid_schema");
  });

  it("rechaza un subject con forma natal (string) en vez de {person_a_body, person_b_body}", () => {
    const payload = buildValidPayload();
    synEvidenceAt(payload, 0).subject = "sun";
    const result = validateVegaSynastryPayload(payload);
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.errorType).toBe("invalid_schema");
  });

  it("rechaza un body desconocido en subject", () => {
    const payload = buildValidPayload();
    (synEvidenceAt(payload, 0).subject as Record<string, unknown>).person_a_body = "xxx";
    const result = validateVegaSynastryPayload(payload);
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.errorType).toBe("invalid_schema");
  });

  it("rechaza versions.facts incorrecta", () => {
    const payload = buildValidPayload({
      versions: {
        facts: "facts_v2",
        synastry_facts: "syn_facts_v1",
        synastry_claims: "syn_claims_v1",
        synastry_evidence_schema: "syn_evidence_v1",
      },
    });
    const result = validateVegaSynastryPayload(payload);
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.errorType).toBe("invalid_versions");
  });

  it("rechaza syn_evidence_schema_version incorrecta en un item", () => {
    const payload = buildValidPayload();
    synEvidenceAt(payload, 0).syn_evidence_schema_version = "syn_evidence_v2";
    const result = validateVegaSynastryPayload(payload);
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.errorType).toBe("invalid_versions");
  });

  it("rechaza provenance.source distinto de synastry_structural_claim", () => {
    const payload = buildValidPayload();
    synEvidenceAt(payload, 0).provenance = { source: "structural_claim" };
    const result = validateVegaSynastryPayload(payload);
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.errorType).toBe("invalid_provenance");
  });

  it("rechaza chart_id_a inconsistente entre un item y el nivel superior", () => {
    const payload = buildValidPayload();
    synEvidenceAt(payload, 1).chart_id_a = "otro-chart";
    const result = validateVegaSynastryPayload(payload);
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.errorType).toBe("chart_id_mismatch");
  });

  it("rechaza chart_id_b inconsistente entre un item y el nivel superior", () => {
    const payload = buildValidPayload();
    synEvidenceAt(payload, 1).chart_id_b = "otro-chart";
    const result = validateVegaSynastryPayload(payload);
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.errorType).toBe("chart_id_mismatch");
  });

  it("rechaza IDs de evidencia duplicados", () => {
    const payload = buildValidPayload();
    synEvidenceAt(payload, 1).id = synEvidenceAt(payload, 0).id;
    const result = validateVegaSynastryPayload(payload);
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.errorType).toBe("duplicate_evidence_ids");
  });

  it("rechaza un id cuyo canonical key invierte los roles A/B respecto a subject", () => {
    const payload = buildValidPayload();
    // El id de synEvidenceAt(payload, 0) codifica sun:moon, pero el
    // subject real de Vega seria moon:sun -- id corrupto o rol invertido.
    (synEvidenceAt(payload, 0).subject as Record<string, unknown>).person_a_body = "moon";
    (synEvidenceAt(payload, 0).subject as Record<string, unknown>).person_b_body = "sun";
    const result = validateVegaSynastryPayload(payload);
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.errorType).toBe("invalid_evidence_id");
  });

  it("rechaza asc para A cuando time_known_a=false", () => {
    const payload = buildValidPayload({
      time_context: { time_known_a: false, time_known_b: true },
      precision: { a: "partial", b: "full" },
      allowed_evidence: [
        evidenceItem("asc", "mars", "trigono", false),
        evidenceItem("venus", "mars", "conjuncion", false),
      ],
    });
    const result = validateVegaSynastryPayload(payload);
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.errorType).toBe("time_coherence_violation");
  });

  it("rechaza mc para B cuando time_known_b=false", () => {
    const payload = buildValidPayload({
      time_context: { time_known_a: true, time_known_b: false },
      precision: { a: "full", b: "partial" },
      allowed_evidence: [
        evidenceItem("sun", "mc", "sextil", false),
        evidenceItem("venus", "mars", "conjuncion", false),
      ],
    });
    const result = validateVegaSynastryPayload(payload);
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.errorType).toBe("time_coherence_violation");
  });

  it("acepta asc de A cuando A es full y B es partial", () => {
    const payload = buildValidPayload({
      time_context: { time_known_a: true, time_known_b: false },
      precision: { a: "full", b: "partial" },
      allowed_evidence: [
        evidenceItem("asc", "mars", "trigono", false),
        evidenceItem("venus", "mars", "conjuncion", false),
      ],
    });
    const result = validateVegaSynastryPayload(payload);
    expect(result.ok).toBe(true);
  });

  it("rechaza precision.a='full' cuando time_known_a=false (incoherencia a nivel de respuesta)", () => {
    const payload = buildValidPayload({ time_context: { time_known_a: false, time_known_b: true } });
    const result = validateVegaSynastryPayload(payload);
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.errorType).toBe("time_coherence_violation");
  });

  it("rechaza orbe presente cuando b es partial (falsa precision)", () => {
    const payload = buildValidPayload({
      time_context: { time_known_a: true, time_known_b: false },
      precision: { a: "full", b: "partial" },
      allowed_evidence: [
        evidenceItem("sun", "moon", "trigono", true),
        evidenceItem("venus", "mars", "conjuncion", false),
      ],
    });
    const result = validateVegaSynastryPayload(payload);
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.errorType).toBe("false_precision_violation");
  });

  it("rechaza exacto presente cuando partial/partial (falsa precision)", () => {
    const payload = buildValidPayload({
      time_context: { time_known_a: false, time_known_b: false },
      precision: { a: "partial", b: "partial" },
      allowed_evidence: [
        evidenceItem("sun", "moon", "trigono", false, {
          payload: { type: "trigono", toca_luminaria: false, toca_angulo: false, orbe_max: 8, exacto: false },
        }),
        evidenceItem("venus", "mars", "conjuncion", false),
      ],
    });
    const result = validateVegaSynastryPayload(payload);
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.errorType).toBe("false_precision_violation");
  });

  it("acepta una respuesta ok con 0 o 1 evidencias (la decision de insuficiencia es del orquestador)", () => {
    const zero = validateVegaSynastryPayload(buildValidPayload({ allowed_evidence: [] }));
    expect(zero.ok).toBe(true);

    const one = validateVegaSynastryPayload(buildValidPayload({ allowed_evidence: [evidenceItem("sun", "moon", "trigono", true)] }));
    expect(one.ok).toBe(true);
  });
});
