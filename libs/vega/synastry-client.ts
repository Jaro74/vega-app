import {
  buildSynastryEvidenceId,
  hasPartialParticipant,
  isSynastryAngleBody,
  SYNASTRY_EVIDENCE_KIND,
  SYNASTRY_PRECISION_SENSITIVE_PAYLOAD_KEYS,
  VEGA_SYNASTRY_PROVENANCE_SOURCE,
  VEGA_SYNASTRY_VERSIONS,
} from "@/types/synastry";
import type {
  VegaSynastryEvidenceItem,
  VegaSynastryEvidencePayload,
  VegaSynastryRequest,
  VegaSynastryResponse,
} from "@/types/synastry";

import { vegaSynastryResponseWireSchema } from "./synastry-schema";
import type { VegaSynastryOkResponseWire } from "./synastry-schema";

// Mismos motivos que VegaFetchErrorType (natal, libs/vega/client.ts) para
// nunca continuar hacia OpenAI, mas los especificos de sinastria:
// invalid_evidence_id (el id recibido no reconstruye el mismo id
// canonico a partir de sus propios campos -- detecta tanto un id
// corrupto como una inversion de roles A/B por parte de Vega) y
// false_precision_violation (orbe/fuerza/exacto presentes cuando algun
// participante es partial, es decir, precision que Vega no deberia
// afirmar).
export type VegaSynastryFetchErrorType =
  | "timeout"
  | "network_error"
  | "http_error"
  | "invalid_schema"
  | "invalid_versions"
  | "invalid_provenance"
  | "chart_id_mismatch"
  | "duplicate_evidence_ids"
  | "time_coherence_violation"
  | "invalid_evidence_id"
  | "false_precision_violation";

export type VegaSynastryFetchResult =
  | { ok: true; data: VegaSynastryResponse }
  | { ok: false; errorType: VegaSynastryFetchErrorType; detail?: string };

export interface VegaSynastryClient {
  fetchSynastryEvidence(input: VegaSynastryRequest): Promise<VegaSynastryFetchResult>;
}

function toDomainItem(item: VegaSynastryOkResponseWire["allowed_evidence"][number]): VegaSynastryEvidenceItem {
  return {
    id: item.id,
    synEvidenceSchemaVersion: item.syn_evidence_schema_version,
    synFactsVersion: item.syn_facts_version,
    synClaimsVersion: item.syn_claims_version,
    factsVersion: item.facts_version,
    chartIdA: item.chart_id_a,
    chartIdB: item.chart_id_b,
    kind: item.kind,
    subject: { personABody: item.subject.person_a_body, personBBody: item.subject.person_b_body },
    // Cast seguro: el zod schema ya valido en runtime que type/toca_luminaria/
    // toca_angulo/orbe_max son obligatorios y orbe/fuerza/exacto opcionales
    // (synastry-schema.ts). Bajo tsconfig.json raiz (strict:false), la
    // inferencia de tipos de zod para este schema marca erroneamente todas
    // las claves como opcionales; el cast documenta esa garantia runtime en
    // vez de relajar VegaSynastryEvidencePayload para acomodar ese artefacto
    // de compilacion no estricto.
    payload: item.payload as VegaSynastryEvidencePayload,
    provenance: { source: item.provenance.source },
  };
}

// Unica funcion de validacion de una respuesta cruda de
// /evidence/synastry, compartida por el cliente real y por los tests
// (mismo patron que validateVegaNatalPayload). Aplica, en orden: schema
// estructural -> insufficient_data se acepta tal cual (resultado de
// dominio, no un error) -> versions exactas (4 campos propios de
// sinastria) -> coherencia precision/time_known por participante ->
// por item: kind, provenance, chart_id_a/b, IDs unicos, ID canonico
// reconstruible (detecta inversion de roles), angulos (asc/mc) solo para
// el participante con hora conocida, ausencia de falsa precision cuando
// cualquiera de los dos participantes es partial. Cualquier fallo aqui es
// terminal: el llamador no debe seguir hacia OpenAI.
export function validateVegaSynastryPayload(payload: unknown): VegaSynastryFetchResult {
  const parsed = vegaSynastryResponseWireSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, errorType: "invalid_schema", detail: parsed.error.message };
  }

  const wire = parsed.data;

  if (wire.status === "insufficient_data") {
    return {
      ok: true,
      data: {
        status: "insufficient_data",
        requestId: wire.request_id,
        insufficientParticipants: wire.insufficient_participants,
      },
    };
  }

  if (
    wire.versions.facts !== VEGA_SYNASTRY_VERSIONS.facts ||
    wire.versions.synastry_facts !== VEGA_SYNASTRY_VERSIONS.synastryFacts ||
    wire.versions.synastry_claims !== VEGA_SYNASTRY_VERSIONS.synastryClaims ||
    wire.versions.synastry_evidence_schema !== VEGA_SYNASTRY_VERSIONS.synastryEvidenceSchema
  ) {
    return { ok: false, errorType: "invalid_versions" };
  }

  const precision = { a: wire.precision.a, b: wire.precision.b };
  if (
    (precision.a === "full") !== wire.time_context.time_known_a ||
    (precision.b === "full") !== wire.time_context.time_known_b
  ) {
    return { ok: false, errorType: "time_coherence_violation" };
  }

  const versions = {
    facts: wire.versions.facts,
    synastryFacts: wire.versions.synastry_facts,
    synastryClaims: wire.versions.synastry_claims,
    synastryEvidenceSchema: wire.versions.synastry_evidence_schema,
  };

  const seenIds = new Set<string>();
  for (const item of wire.allowed_evidence) {
    if (
      item.syn_evidence_schema_version !== versions.synastryEvidenceSchema ||
      item.syn_facts_version !== versions.synastryFacts ||
      item.syn_claims_version !== versions.synastryClaims ||
      item.facts_version !== versions.facts
    ) {
      return { ok: false, errorType: "invalid_versions" };
    }

    if (item.kind !== SYNASTRY_EVIDENCE_KIND) {
      return { ok: false, errorType: "invalid_schema", detail: `kind inesperado: ${item.kind}` };
    }

    if (item.provenance.source !== VEGA_SYNASTRY_PROVENANCE_SOURCE) {
      return { ok: false, errorType: "invalid_provenance" };
    }

    if (item.chart_id_a !== wire.chart_id_a || item.chart_id_b !== wire.chart_id_b) {
      return { ok: false, errorType: "chart_id_mismatch" };
    }

    if (seenIds.has(item.id)) {
      return { ok: false, errorType: "duplicate_evidence_ids" };
    }
    seenIds.add(item.id);

    const subject = { personABody: item.subject.person_a_body, personBBody: item.subject.person_b_body };
    const expectedId = buildSynastryEvidenceId(versions, item.chart_id_a, item.chart_id_b, subject, item.payload.type);
    if (item.id !== expectedId) {
      // Cubre tanto un id corrupto/inventado como una inversion de roles
      // A/B (el id codifica person_a_body:person_b_body en ese orden
      // exacto; si Vega los intercambiara, el id reconstruido no
      // coincidiria).
      return { ok: false, errorType: "invalid_evidence_id" };
    }

    if (isSynastryAngleBody(subject.personABody) && !wire.time_context.time_known_a) {
      return { ok: false, errorType: "time_coherence_violation" };
    }
    if (isSynastryAngleBody(subject.personBBody) && !wire.time_context.time_known_b) {
      return { ok: false, errorType: "time_coherence_violation" };
    }

    if (hasPartialParticipant(precision)) {
      const hasPrecisionSensitiveKey = SYNASTRY_PRECISION_SENSITIVE_PAYLOAD_KEYS.some(
        (key) => item.payload[key] !== undefined
      );
      if (hasPrecisionSensitiveKey) {
        return { ok: false, errorType: "false_precision_violation" };
      }
    }
  }

  return {
    ok: true,
    data: {
      status: "ok",
      requestId: wire.request_id,
      chartIdA: wire.chart_id_a,
      chartIdB: wire.chart_id_b,
      versions,
      timeContext: { timeKnownA: wire.time_context.time_known_a, timeKnownB: wire.time_context.time_known_b },
      precision,
      allowedEvidence: wire.allowed_evidence.map(toDomainItem),
    },
  };
}
