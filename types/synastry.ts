// Contrato definitivo del motor Vega para Sprint 3B (segmento B,
// POST /evidence/synastry). Fuente: documentacion/VEGA_Resumen_hasta_Sinastria_v1.md
// mas verificacion directa contra la API real en Railway (gate Sprint 3B,
// full/full, full/partial, partial/partial, minimal), igual que Sprint 3A
// hizo para /evidence/natal.
//
// Deliberadamente NO se reutiliza VegaEvidenceItem (types/vega.ts): el
// "subject" de sinastria es {person_a_body, person_b_body} (direccional,
// nunca alfabetico), no string | string[] | null como en natal. Forzar un
// tipo comun mezclaria dos contratos distintos.

export const VEGA_SYNASTRY_VERSIONS = {
  facts: "facts_v1",
  synastryFacts: "syn_facts_v1",
  synastryClaims: "syn_claims_v1",
  synastryEvidenceSchema: "syn_evidence_v1",
} as const;

export const SYNASTRY_EVIDENCE_KIND = "inter_chart_aspect" as const;

// Confirmado contra Railway (gate Sprint 3B): distinto de
// VEGA_EVIDENCE_PROVENANCE_SOURCE ("structural_claim") de natal.
export const VEGA_SYNASTRY_PROVENANCE_SOURCE = "synastry_structural_claim" as const;

export const SYNASTRY_PLANETARY_BODIES = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "north_node",
  "lilith_mean",
] as const;

// asc/mc solo son cuerpos validos para una persona si su hora de
// nacimiento es conocida (documentacion/VEGA_Resumen_hasta_Sinastria_v1.md,
// seccion 4 "Roles A/B"; verificado contra Railway: full/partial nunca
// devuelve asc/mc para el participante partial).
export const SYNASTRY_ANGLE_BODIES = ["asc", "mc"] as const;

export const SYNASTRY_BODIES = [...SYNASTRY_PLANETARY_BODIES, ...SYNASTRY_ANGLE_BODIES] as const;

export const SYNASTRY_ASPECT_TYPES = ["conjuncion", "sextil", "cuadratura", "trigono", "oposicion"] as const;

// Unicas claves de "payload" que dependen de que ambos participantes sean
// "full" (verificado contra Railway: full/partial y partial/partial las
// omiten por completo, nunca las envian con un valor aproximado).
export const SYNASTRY_PRECISION_SENSITIVE_PAYLOAD_KEYS = ["orbe", "fuerza", "exacto"] as const;

export type SynastryBody = (typeof SYNASTRY_BODIES)[number];
export type SynastryAspectType = (typeof SYNASTRY_ASPECT_TYPES)[number];
export type SynastryParticipant = "a" | "b";

// "minimal" nunca aparece aqui: Vega siempre resuelve una persona minimal
// como insufficient_data a nivel de respuesta completa, nunca como un
// status="ok" con precision "minimal" (verificado contra Railway).
export type SynastryParticipantPrecision = "full" | "partial";

export function isSynastryAngleBody(body: string): body is (typeof SYNASTRY_ANGLE_BODIES)[number] {
  return (SYNASTRY_ANGLE_BODIES as readonly string[]).includes(body);
}

export interface VegaSynastrySubject {
  personABody: SynastryBody;
  personBBody: SynastryBody;
}

// payload es opaco para el experimento (misma regla que VegaEvidenceItem
// natal): solo Vega conoce su forma interna completa. "type" (aspecto),
// "toca_luminaria" y "toca_angulo" se listan porque estan presentes
// siempre (full y no-full); orbe/fuerza/exacto solo con full/full.
export interface VegaSynastryEvidencePayload {
  type: SynastryAspectType;
  toca_luminaria: boolean;
  toca_angulo: boolean;
  orbe_max: number;
  orbe?: number;
  fuerza?: number;
  exacto?: boolean;
  [key: string]: unknown;
}

export interface VegaSynastryEvidenceProvenance {
  source: string;
}

// Sin "label": confirmado contra Railway que el wire real NO incluye ese
// campo (a diferencia de lo que sugeria la forma interna en Python
// documentada en VEGA_Resumen_hasta_Sinastria_v1.md, seccion 9).
export interface VegaSynastryEvidenceItem {
  id: string;
  synEvidenceSchemaVersion: string;
  synFactsVersion: string;
  synClaimsVersion: string;
  factsVersion: string;
  chartIdA: string;
  chartIdB: string;
  kind: string;
  subject: VegaSynastrySubject;
  payload: VegaSynastryEvidencePayload;
  provenance: VegaSynastryEvidenceProvenance;
}

export interface VegaSynastryVersions {
  facts: string;
  synastryFacts: string;
  synastryClaims: string;
  synastryEvidenceSchema: string;
}

export interface VegaSynastryTimeContext {
  timeKnownA: boolean;
  timeKnownB: boolean;
}

export interface VegaSynastryPrecision {
  a: SynastryParticipantPrecision;
  b: SynastryParticipantPrecision;
}

export interface VegaSynastryOkResponse {
  status: "ok";
  requestId: string;
  chartIdA: string;
  chartIdB: string;
  versions: VegaSynastryVersions;
  timeContext: VegaSynastryTimeContext;
  precision: VegaSynastryPrecision;
  allowedEvidence: VegaSynastryEvidenceItem[];
}

export interface VegaSynastryInsufficientDataResponse {
  status: "insufficient_data";
  requestId: string;
  insufficientParticipants: SynastryParticipant[];
}

export type VegaSynastryResponse = VegaSynastryOkResponse | VegaSynastryInsufficientDataResponse;

// Nullable a proposito: "minimal" (solo fecha) se envia sin tz/lat/lon/
// hora -- nunca se inventa ninguno de estos valores (regla dura desde
// Sprint 2, "nunca se inventa una hora de nacimiento").
export interface VegaSynastryBirthData {
  birthDate: string;
  birthTime: string | null;
  birthTimeKnown: boolean;
  latitude: number | null;
  longitude: number | null;
  timezoneId: string | null;
}

export interface VegaSynastryRequest {
  requestId?: string;
  birthDataA: VegaSynastryBirthData;
  birthDataB: VegaSynastryBirthData;
}

// Unica funcion constructora del ID canonico de evidencia (documentacion/
// VEGA_Resumen_hasta_Sinastria_v1.md, seccion 8), usada tanto para
// verificar el ID recibido de Vega (defensa contra inversion de roles
// A/B) como, potencialmente, para pruebas. Formato verificado contra
// Railway caracter a caracter.
export function buildSynastryEvidenceId(
  versions: VegaSynastryVersions,
  chartIdA: string,
  chartIdB: string,
  subject: VegaSynastrySubject,
  aspectType: SynastryAspectType
): string {
  return [
    versions.synastryEvidenceSchema,
    versions.synastryFacts,
    versions.synastryClaims,
    versions.facts,
    chartIdA,
    chartIdB,
    "inter_aspect",
    subject.personABody,
    subject.personBBody,
    aspectType,
  ].join(":");
}

// Verificado contra Railway: cuando cualquiera de los dos participantes
// es "partial", Vega omite orbe/fuerza/exacto del payload por completo.
// Con full/full pueden faltar solo si el propio motor decide no
// incluirlos (nunca se exige su presencia, solo se prohibe cuando no
// deberian estar).
export function hasPartialParticipant(precision: VegaSynastryPrecision): boolean {
  return precision.a === "partial" || precision.b === "partial";
}
