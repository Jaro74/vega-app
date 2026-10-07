import { VEGA_SYNASTRY_PROVENANCE_SOURCE, VEGA_SYNASTRY_VERSIONS } from "@/types/synastry";
import type { VegaSynastryRequest } from "@/types/synastry";

import { validateVegaSynastryPayload } from "./synastry-client";
import type { VegaSynastryClient, VegaSynastryFetchResult } from "./synastry-client";

function isUsableForVega(birthData: VegaSynastryRequest["birthDataA"]): boolean {
  return birthData.latitude !== null && birthData.longitude !== null && birthData.timezoneId !== null;
}

function mockChartId(prefix: "a" | "b", birthDate: string): string {
  return `mock-chart-${prefix}-${birthDate}`;
}

function evidenceItemWire(
  chartIdA: string,
  chartIdB: string,
  personABody: string,
  personBBody: string,
  aspectType: string,
  fullFull: boolean
) {
  const id = [
    VEGA_SYNASTRY_VERSIONS.synastryEvidenceSchema,
    VEGA_SYNASTRY_VERSIONS.synastryFacts,
    VEGA_SYNASTRY_VERSIONS.synastryClaims,
    VEGA_SYNASTRY_VERSIONS.facts,
    chartIdA,
    chartIdB,
    "inter_aspect",
    personABody,
    personBBody,
    aspectType,
  ].join(":");

  return {
    id,
    syn_evidence_schema_version: VEGA_SYNASTRY_VERSIONS.synastryEvidenceSchema,
    syn_facts_version: VEGA_SYNASTRY_VERSIONS.synastryFacts,
    syn_claims_version: VEGA_SYNASTRY_VERSIONS.synastryClaims,
    facts_version: VEGA_SYNASTRY_VERSIONS.facts,
    chart_id_a: chartIdA,
    chart_id_b: chartIdB,
    kind: "inter_chart_aspect",
    subject: { person_a_body: personABody, person_b_body: personBBody },
    payload: fullFull
      ? { type: aspectType, toca_luminaria: true, toca_angulo: personABody === "asc" || personBBody === "asc", orbe_max: 8, orbe: 1.2, fuerza: 0.75, exacto: false }
      : { type: aspectType, toca_luminaria: true, toca_angulo: personABody === "asc" || personBBody === "asc", orbe_max: 8 },
    provenance: { source: VEGA_SYNASTRY_PROVENANCE_SOURCE },
  };
}

// Doble de pruebas para el desarrollo/CI normal (VEGA_CLIENT_DRIVER=mock,
// valor por defecto). Nunca calcula astrologia real -- construye una
// respuesta "wire" sintetica y la pasa por validateVegaSynastryPayload,
// para que el mock nunca pueda desviarse del contrato que el validador
// real exige. El gate real (Railway) usa HttpVegaSynastryClient en su
// lugar.
export class MockVegaSynastryClient implements VegaSynastryClient {
  async fetchSynastryEvidence(input: VegaSynastryRequest): Promise<VegaSynastryFetchResult> {
    const aUsable = isUsableForVega(input.birthDataA);
    const bUsable = isUsableForVega(input.birthDataB);

    if (!aUsable || !bUsable) {
      const insufficientParticipants: string[] = [];
      if (!aUsable) insufficientParticipants.push("a");
      if (!bUsable) insufficientParticipants.push("b");
      return validateVegaSynastryPayload({
        status: "insufficient_data",
        request_id: input.requestId ?? crypto.randomUUID(),
        insufficient_participants: insufficientParticipants,
      });
    }

    const timeKnownA = input.birthDataA.birthTimeKnown;
    const timeKnownB = input.birthDataB.birthTimeKnown;
    const fullFull = timeKnownA && timeKnownB;

    const chartIdA = mockChartId("a", input.birthDataA.birthDate);
    const chartIdB = mockChartId("b", input.birthDataB.birthDate);

    const items = [
      evidenceItemWire(chartIdA, chartIdB, "sun", "moon", "trigono", fullFull),
      evidenceItemWire(chartIdA, chartIdB, "venus", "mars", "conjuncion", fullFull),
    ];
    if (timeKnownA) {
      items.push(evidenceItemWire(chartIdA, chartIdB, "asc", "venus", "sextil", fullFull));
    }

    return validateVegaSynastryPayload({
      status: "ok",
      request_id: input.requestId ?? crypto.randomUUID(),
      chart_id_a: chartIdA,
      chart_id_b: chartIdB,
      versions: {
        facts: VEGA_SYNASTRY_VERSIONS.facts,
        synastry_facts: VEGA_SYNASTRY_VERSIONS.synastryFacts,
        synastry_claims: VEGA_SYNASTRY_VERSIONS.synastryClaims,
        synastry_evidence_schema: VEGA_SYNASTRY_VERSIONS.synastryEvidenceSchema,
      },
      time_context: { time_known_a: timeKnownA, time_known_b: timeKnownB },
      precision: { a: timeKnownA ? "full" : "partial", b: timeKnownB ? "full" : "partial" },
      allowed_evidence: items,
    });
  }
}
