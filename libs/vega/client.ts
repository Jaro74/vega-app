import {
  isTimeDependentEvidenceItem,
  VEGA_EVIDENCE_PROVENANCE_SOURCE,
  VEGA_EVIDENCE_VERSIONS,
} from "@/types/vega";
import type { VegaEvidenceItem, VegaNatalRequest, VegaNatalResponse } from "@/types/vega";

import { vegaNatalResponseWireSchema } from "./schema";

// Motivos por los que el experimento nunca debe continuar hacia OpenAI
// con una respuesta de Vega. "Rechazar evidencia invalida, no continuar
// hacia OpenAI si Vega devuelve una respuesta invalida" (encargo Sprint
// 3A, seccion "Cliente Vega API").
export type VegaFetchErrorType =
  | "timeout"
  | "network_error"
  | "http_error"
  | "invalid_schema"
  | "invalid_versions"
  | "invalid_provenance"
  | "chart_id_mismatch"
  | "duplicate_evidence_ids"
  | "time_coherence_violation";

export type VegaFetchResult =
  | { ok: true; data: VegaNatalResponse }
  | { ok: false; errorType: VegaFetchErrorType; detail?: string };

export interface VegaEvidenceClient {
  fetchNatalEvidence(input: VegaNatalRequest): Promise<VegaFetchResult>;
}

// Unica funcion de validacion de una respuesta cruda de /evidence/natal,
// compartida por el cliente real y por los tests. Aplica, en orden:
// schema estructural -> versions exactas -> provenance.source por item
// -> chart_id consistente entre todos los items y con el chart_id de
// nivel superior -> IDs unicos -> coherencia time_known (Sprint 3A: si
// time_known=false, ningun item puede depender de hora). Cualquier fallo
// aqui es terminal: el llamador no debe seguir hacia OpenAI.
export function validateVegaNatalPayload(payload: unknown): VegaFetchResult {
  const parsed = vegaNatalResponseWireSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, errorType: "invalid_schema", detail: parsed.error.message };
  }

  const wire = parsed.data;

  if (
    wire.versions.facts !== VEGA_EVIDENCE_VERSIONS.facts ||
    wire.versions.claims !== VEGA_EVIDENCE_VERSIONS.claims ||
    wire.versions.evidence_schema !== VEGA_EVIDENCE_VERSIONS.evidenceSchema
  ) {
    return { ok: false, errorType: "invalid_versions" };
  }

  const seenIds = new Set<string>();
  for (const item of wire.allowed_evidence) {
    if (item.provenance.source !== VEGA_EVIDENCE_PROVENANCE_SOURCE) {
      return { ok: false, errorType: "invalid_provenance" };
    }
    if (item.chart_id !== wire.chart_id) {
      return { ok: false, errorType: "chart_id_mismatch" };
    }
    if (seenIds.has(item.id)) {
      return { ok: false, errorType: "duplicate_evidence_ids" };
    }
    seenIds.add(item.id);

    // Cast: zod garantiza kind/subject en runtime (campos no opcionales
    // en vegaEvidenceItemWireSchema); el tipo inferido por TS para items
    // dentro de z.array(z.object(...)) los marca opcionales por una
    // limitacion de esta version de zod/TS, no por el schema real.
    if (
      !wire.time_context.time_known &&
      isTimeDependentEvidenceItem(item as { kind: string; subject: string | string[] | null })
    ) {
      return { ok: false, errorType: "time_coherence_violation" };
    }
  }

  const data: VegaNatalResponse = {
    requestId: wire.request_id,
    chartId: wire.chart_id,
    versions: {
      facts: wire.versions.facts,
      claims: wire.versions.claims,
      evidenceSchema: wire.versions.evidence_schema,
    },
    timeContext: { timeKnown: wire.time_context.time_known },
    allowedEvidence: wire.allowed_evidence.map(
      (item): VegaEvidenceItem => ({
        id: item.id,
        schemaVersion: item.schema_version,
        factsVersion: item.facts_version,
        claimsVersion: item.claims_version,
        chartId: item.chart_id,
        kind: item.kind,
        subject: item.subject,
        payload: item.payload,
        provenance: { source: item.provenance.source },
      })
    ),
  };

  return { ok: true, data };
}
