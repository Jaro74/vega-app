import { describe, expect, it } from "vitest";

import { buildSynastryPreviewUserInput } from "@/libs/openai/synastry-preview-prompt";
import type { SynastryPreviewPromptInput } from "@/libs/openai/synastry-preview-prompt";

function buildInput(overrides: Partial<SynastryPreviewPromptInput> = {}): SynastryPreviewPromptInput {
  return {
    segment: "B",
    trigger: "distance",
    userContext: "Un contexto de prueba",
    userProfilePrecision: "full",
    partnerPrecision: "partial",
    timeKnownA: true,
    timeKnownB: false,
    allowedEvidence: [
      {
        id: "syn_evidence_v1:syn_facts_v1:syn_claims_v1:facts_v1:chart-a:chart-b:inter_aspect:sun:moon:trigono",
        kind: "inter_chart_aspect",
        subject: { person_a_body: "sun", person_b_body: "moon" },
        aspectType: "trigono",
        payload: { type: "trigono", toca_luminaria: true, toca_angulo: false, orbe_max: 8 },
      },
    ],
    ...overrides,
  };
}

describe("buildSynastryPreviewUserInput", () => {
  it("incluye segment, precisiones, time_known_a/b y la evidencia con roles preservados", () => {
    const json = JSON.parse(buildSynastryPreviewUserInput(buildInput()));

    expect(json.segment).toBe("B");
    expect(json.trigger).toBe("distance");
    expect(json.user_profile_precision).toBe("full");
    expect(json.partner_precision).toBe("partial");
    expect(json.time_known_a).toBe(true);
    expect(json.time_known_b).toBe(false);
    expect(json.output_schema).toBe("preview_v1");
    expect(json.allowed_evidence).toHaveLength(1);
    expect(json.allowed_evidence[0].subject).toEqual({ person_a_body: "sun", person_b_body: "moon" });
    expect(json.allowed_evidence[0].aspect_type).toBe("trigono");
  });

  it("nunca incluye metadatos internos de Vega (provenance, versiones) ni coordenadas/fechas de nacimiento", () => {
    // El "id" de cada evidencia SI viaja (el modelo debe referenciarlo tal
    // cual en su salida, igual que en el prompt de segmento A) y, por
    // formato de contrato de sinastria, codifica chart_id_a/chart_id_b:
    // eso es una huella opaca, no un dato bruto, y es necesario para que
    // preview_v1 pueda validar los IDs elegidos. Lo que nunca debe
    // aparecer es metadata adicional (provenance, versiones sueltas,
    // coordenadas, fechas) que el builder no reenvia a proposito.
    const raw = buildSynastryPreviewUserInput(buildInput());

    expect(raw).not.toContain("provenance");
    expect(raw).not.toContain("schema_version");
    expect(raw).not.toContain("lat");
    expect(raw).not.toContain("lon");
    expect(raw).not.toContain("1990-05-12");
    expect(raw).not.toMatch(/"syn_facts_version"|"syn_claims_version"|"syn_evidence_schema_version"/);
  });

  it("user_context null cuando no se aporta texto libre", () => {
    const json = JSON.parse(buildSynastryPreviewUserInput(buildInput({ userContext: null })));
    expect(json.user_context).toBeNull();
  });
});
