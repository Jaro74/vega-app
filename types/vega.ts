// Contrato definitivo del motor Vega para Sprint 3A (segmento A,
// POST /evidence/natal). Fuente: encargo "SPRINT 3A - VEGA NATAL
// EVIDENCE + OPENAI PREVIEW PARA SEGMENTO A".
//
// Sustituye, para el flujo real implementado en Sprint 3A, a las formas
// especulativas de Sprint 0 en types/preview.ts (VegaRequestA,
// VegaResponseA, AllowedEvidenceItem), que modelaban un contrato todavia
// no confirmado por el equipo de Vega. Esas formas no se tocan (siguen
// declaradas para el segmento B / Sprint 3B, fuera de alcance aqui) para
// no rediseñar nada ya aprobado.

export const VEGA_EVIDENCE_VERSIONS = {
  facts: "facts_v1",
  claims: "claims_v1",
  evidenceSchema: "evidence_v1",
} as const;

export const VEGA_EVIDENCE_PROVENANCE_SOURCE = "structural_claim" as const;

// Claims estructurales cuyo calculo depende de conocer la hora de
// nacimiento. Si time_known=false, Vega no debe producir evidencia de
// este tipo (VEGA_Fase_4C, especificacion de Sprint 3A); el cliente del
// experimento nunca reconstruye ni infiere estos valores por su cuenta,
// solo verifica que Vega respeta la regla.
//
// Descubierto contra la API real (gate Sprint 3A): "kind" por si solo no
// basta. Vega tambien codifica dependencia de hora dentro de "subject"
// (ej. kind="aspect", subject=["asc","mc"]; kind="proximity",
// subject=["sun","mc"]). Por eso la comprobacion real
// (isTimeDependentEvidenceItem, mas abajo) mira ambos campos.
export const TIME_DEPENDENT_EVIDENCE_KINDS = ["house", "angularity", "most_elevated"] as const;

export const TIME_DEPENDENT_SUBJECT_TOKENS = [
  "asc",
  "mc",
  "ic",
  "ascendant",
  "midheaven",
  "imum_coeli",
] as const;

function subjectContainsTimeDependentToken(subject: string | string[] | null): boolean {
  if (subject === null) return false;
  const values = Array.isArray(subject) ? subject : [subject];
  return values.some((value) =>
    TIME_DEPENDENT_SUBJECT_TOKENS.some((token) => value.toLowerCase() === token)
  );
}

// Unica fuente de verdad para "esta evidencia depende de una hora de
// nacimiento conocida", usada tanto al validar la respuesta cruda de
// Vega (libs/vega/client.ts) como al validar que el preview generado por
// OpenAI no referencia ese tipo de evidencia cuando time_known=false
// (libs/validation/preview-generation.ts).
export function isTimeDependentEvidenceItem(item: { kind: string; subject: string | string[] | null }): boolean {
  const normalizedKind = item.kind.toLowerCase();
  const kindIsTimeDependent = TIME_DEPENDENT_EVIDENCE_KINDS.some((forbidden) =>
    normalizedKind.includes(forbidden)
  );
  return kindIsTimeDependent || subjectContainsTimeDependentToken(item.subject);
}

export interface VegaBirthData {
  birthDate: string;
  birthTime: string | null;
  birthTimeKnown: boolean;
  latitude: number;
  longitude: number;
  timezoneId: string;
}

export interface VegaNatalRequest {
  requestId?: string;
  birthData: VegaBirthData;
}

export interface VegaEvidenceProvenance {
  source: string;
}

// EvidenceItem v1. payload es una estructura opaca para el experimento:
// solo Vega conoce su forma interna; el cliente nunca la interpreta ni
// la recalcula, solo la reenvia a OpenAI como contexto ya validado.
export interface VegaEvidenceItem {
  id: string;
  schemaVersion: string;
  factsVersion: string;
  claimsVersion: string;
  chartId: string;
  kind: string;
  // Observado contra la API real: string para un unico cuerpo/punto,
  // array para relaciones entre varios (aspectos, proximidad), null
  // cuando el claim no se refiere a un cuerpo concreto (ej. patrones,
  // balance elemental).
  subject: string | string[] | null;
  payload: Record<string, unknown>;
  provenance: VegaEvidenceProvenance;
}

export interface VegaNatalVersions {
  facts: string;
  claims: string;
  evidenceSchema: string;
}

export interface VegaTimeContext {
  timeKnown: boolean;
}

export interface VegaNatalResponse {
  requestId: string;
  chartId: string;
  versions: VegaNatalVersions;
  timeContext: VegaTimeContext;
  allowedEvidence: VegaEvidenceItem[];
}
