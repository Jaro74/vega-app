import { VEGA_EVIDENCE_PROVENANCE_SOURCE, VEGA_EVIDENCE_VERSIONS } from "@/types/vega";
import type { VegaNatalRequest } from "@/types/vega";

import type { VegaEvidenceClient, VegaFetchResult } from "./client";

// Doble de pruebas para el desarrollo/CI normal (VEGA_CLIENT_DRIVER=mock,
// valor por defecto). Nunca calcula astrologia real -- eso violaria "el
// motor Vega es la unica autoridad para calculos astrologicos"; en su
// lugar devuelve dos structural claims sinteticos, marcados como fixture
// en su propio payload, solo para poder ejercitar el resto del pipeline
// (validacion, OpenAI, persistencia, UI, E2E) sin depender de Railway.
// El gate real (Sprint 3A, seccion "Validacion real") usa
// HttpVegaEvidenceClient contra el proyecto Vega real en su lugar.
export class MockVegaEvidenceClient implements VegaEvidenceClient {
  async fetchNatalEvidence(input: VegaNatalRequest): Promise<VegaFetchResult> {
    const chartId = `mock-chart-${input.birthData.birthDate}`;
    const timeKnown = input.birthData.birthTimeKnown;

    return {
      ok: true,
      data: {
        requestId: input.requestId ?? crypto.randomUUID(),
        chartId,
        versions: {
          facts: VEGA_EVIDENCE_VERSIONS.facts,
          claims: VEGA_EVIDENCE_VERSIONS.claims,
          evidenceSchema: VEGA_EVIDENCE_VERSIONS.evidenceSchema,
        },
        timeContext: { timeKnown },
        allowedEvidence: [
          {
            id: "mock_ev_1",
            schemaVersion: VEGA_EVIDENCE_VERSIONS.evidenceSchema,
            factsVersion: VEGA_EVIDENCE_VERSIONS.facts,
            claimsVersion: VEGA_EVIDENCE_VERSIONS.claims,
            chartId,
            kind: "mock_structural_claim",
            subject: "mock_subject_primary",
            payload: { fixture: true, note: "Dato sintetico de prueba, no astrologia real." },
            provenance: { source: VEGA_EVIDENCE_PROVENANCE_SOURCE },
          },
          {
            id: "mock_ev_2",
            schemaVersion: VEGA_EVIDENCE_VERSIONS.evidenceSchema,
            factsVersion: VEGA_EVIDENCE_VERSIONS.facts,
            claimsVersion: VEGA_EVIDENCE_VERSIONS.claims,
            chartId,
            kind: "mock_structural_claim",
            subject: "mock_subject_secondary",
            payload: { fixture: true, note: "Dato sintetico de prueba, no astrologia real." },
            provenance: { source: VEGA_EVIDENCE_PROVENANCE_SOURCE },
          },
        ],
      },
    };
  }
}
