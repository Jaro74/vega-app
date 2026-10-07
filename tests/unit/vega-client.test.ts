import { describe, expect, it } from "vitest";

import { validateVegaNatalPayload } from "@/libs/vega/client";

function evidenceAt(payload: Record<string, unknown>, index: number): Record<string, unknown> {
  const evidence = payload.allowed_evidence as Record<string, unknown>[];
  const item = evidence[index];
  if (!item) throw new Error(`evidence[${index}] no existe en el payload de prueba`);
  return item;
}

function buildValidPayload(overrides: Record<string, unknown> = {}) {
  return {
    request_id: "req-1",
    chart_id: "chart-1",
    versions: { facts: "facts_v1", claims: "claims_v1", evidence_schema: "evidence_v1" },
    time_context: { time_known: true },
    allowed_evidence: [
      {
        id: "ev_001",
        schema_version: "evidence_v1",
        facts_version: "facts_v1",
        claims_version: "claims_v1",
        chart_id: "chart-1",
        kind: "planet_position",
        subject: "sun",
        payload: { sign: "leo" },
        provenance: { source: "structural_claim" },
      },
      {
        id: "ev_002",
        schema_version: "evidence_v1",
        facts_version: "facts_v1",
        claims_version: "claims_v1",
        chart_id: "chart-1",
        kind: "aspect",
        subject: "sun_moon",
        payload: { angle: 90 },
        provenance: { source: "structural_claim" },
      },
    ],
    ...overrides,
  };
}

describe("validateVegaNatalPayload", () => {
  it("acepta una respuesta valida con time_known=true", () => {
    const result = validateVegaNatalPayload(buildValidPayload());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.chartId).toBe("chart-1");
      expect(result.data.allowedEvidence).toHaveLength(2);
      expect(result.data.timeContext.timeKnown).toBe(true);
    }
  });

  it("acepta una respuesta valida con time_known=false sin evidencia dependiente de hora", () => {
    const payload = buildValidPayload({ time_context: { time_known: false } });
    const result = validateVegaNatalPayload(payload);
    expect(result.ok).toBe(true);
  });

  it("rechaza un schema invalido (falta allowed_evidence)", () => {
    const payload = buildValidPayload();
    delete (payload as Record<string, unknown>).allowed_evidence;
    const result = validateVegaNatalPayload(payload);
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.errorType).toBe("invalid_schema");
  });

  it("rechaza versions incorrectas", () => {
    const payload = buildValidPayload({
      versions: { facts: "facts_v2", claims: "claims_v1", evidence_schema: "evidence_v1" },
    });
    const result = validateVegaNatalPayload(payload);
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.errorType).toBe("invalid_versions");
  });

  it("rechaza provenance.source distinto de structural_claim", () => {
    const payload = buildValidPayload();
    evidenceAt(payload, 0).provenance = { source: "llm_inference" };
    const result = validateVegaNatalPayload(payload);
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.errorType).toBe("invalid_provenance");
  });

  it("rechaza un chart_id inconsistente entre items", () => {
    const payload = buildValidPayload();
    evidenceAt(payload, 1).chart_id = "chart-2";
    const result = validateVegaNatalPayload(payload);
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.errorType).toBe("chart_id_mismatch");
  });

  it("rechaza IDs de evidencia duplicados", () => {
    const payload = buildValidPayload();
    evidenceAt(payload, 1).id = "ev_001";
    const result = validateVegaNatalPayload(payload);
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.errorType).toBe("duplicate_evidence_ids");
  });

  it("rechaza evidencia dependiente de hora (house) cuando time_known=false", () => {
    const payload = buildValidPayload({ time_context: { time_known: false } });
    evidenceAt(payload, 0).kind = "house_cusp";
    const result = validateVegaNatalPayload(payload);
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.errorType).toBe("time_coherence_violation");
  });

  it("rechaza evidencia de angularity cuando time_known=false", () => {
    const payload = buildValidPayload({ time_context: { time_known: false } });
    evidenceAt(payload, 0).kind = "angularity";
    const result = validateVegaNatalPayload(payload);
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.errorType).toBe("time_coherence_violation");
  });

  // Forma real observada contra Vega en Railway (gate Sprint 3A): un
  // aspecto entre Ascendente y MC llega con kind="aspect" (no
  // dependiente de hora por si solo) y subject=["asc","mc"]. La
  // dependencia de hora esta codificada en subject, no en kind.
  it("rechaza un aspecto asc+mc (subject array) cuando time_known=false, aunque kind='aspect'", () => {
    const payload = buildValidPayload({ time_context: { time_known: false } });
    evidenceAt(payload, 0).kind = "aspect";
    evidenceAt(payload, 0).subject = ["asc", "mc"];
    const result = validateVegaNatalPayload(payload);
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.errorType).toBe("time_coherence_violation");
  });

  it("acepta un aspecto entre dos planetas (subject array sin asc/mc/ic) cuando time_known=false", () => {
    const payload = buildValidPayload({ time_context: { time_known: false } });
    evidenceAt(payload, 0).kind = "aspect";
    evidenceAt(payload, 0).subject = ["jupiter", "venus"];
    const result = validateVegaNatalPayload(payload);
    expect(result.ok).toBe(true);
  });

  it("acepta subject=null (ej. patrones, balance elemental)", () => {
    const payload = buildValidPayload();
    evidenceAt(payload, 0).kind = "pattern";
    evidenceAt(payload, 0).subject = null;
    const result = validateVegaNatalPayload(payload);
    expect(result.ok).toBe(true);
  });
});
