// Tipos congelados del experimento VEGA (Sprint 0 - Base y Contratos).
// Fuente: documentacion/VEGA_Fase_4C_Especificacion_Final_Experimento.md

export type Segment = "A" | "B";

export const TRIGGERS_A = [
  "career",
  "blocked",
  "major_change",
  "identity",
  "family",
  "repeating_pattern",
  "relationship_spillover",
  "other",
] as const;

export type TriggerA = (typeof TRIGGERS_A)[number];

export const TRIGGERS_B = [
  "new_connection",
  "relationship",
  "conflict",
  "distance",
  "breakup",
  "ex",
  "on_off",
  "other",
] as const;

export type TriggerB = (typeof TRIGGERS_B)[number];

export type Trigger = TriggerA | TriggerB;

// Segmento B unicamente (encargo "eliminar free_text de Segmento B"):
// sustituye el texto libre por contexto estructurado cerrado. Responde a
// una pregunta distinta de trigger ("que quieres comprender mejor de esta
// relacion", no "que situacion te trae") -- por eso no duplica ningun
// valor de TRIGGERS_B (se elimino deliberadamente "conflict", que ya
// existe ahi, y "closeness_distance" se renombro a "emotional_closeness"
// para no solaparse con TRIGGERS_B.distance). Nunca incluye "other": una
// opcion abierta reintroduciria exactamente el riesgo de texto libre que
// este catalogo sustituye.
export const RELATIONSHIP_FOCUS_OPTIONS = [
  "communication",
  "emotional_closeness",
  "trust_security",
  "current_change",
  "repeating_pattern",
  "navigating_relationship",
] as const;

export type RelationshipFocus = (typeof RELATIONSHIP_FOCUS_OPTIONS)[number];

// Segmento B unicamente. Autodescripcion del usuario en primera persona
// sobre como vive la relacion -- nunca una categoria sobre la Persona B.
// Ninguno es un termino clinico/diagnostico: mismo registro coloquial que
// TRIGGERS_A.blocked ("Me siento bloqueado/a"), ya aprobado.
export const USER_EMOTIONAL_STATE_OPTIONS = [
  "confused",
  "insecure",
  "distant",
  "frustrated",
  "blocked",
  "hopeful",
  "calm",
  "curious",
] as const;

export type UserEmotionalState = (typeof USER_EMOTIONAL_STATE_OPTIONS)[number];

// Segmento B unicamente, opcional. Pregunta exclusivamente sobre el
// usuario ("cuanto te esta afectando esta situacion ahora mismo"), nunca
// sobre la Persona B.
export type ImpactIntensity = 1 | 2 | 3 | 4 | 5;

export type OwnProfilePrecision = "full" | "limited";

export type PartnerPrecision = "full" | "partial" | "minimal";

export const FLOW_STEPS = [
  "problem",
  "problem_text",
  "own_profile_intro",
  "birth_date",
  "birth_time",
  "birth_place",
  "partner_intro",
  "partner_data",
  "preview",
  "paywall",
  "access_intent",
  "waitlist",
] as const;

export type FlowStep = (typeof FLOW_STEPS)[number];

export interface FlowAttemptState {
  flowAttemptId: string;
  segment: Segment;
  lastCompletedStep: FlowStep | null;
  isPrimaryAttempt: boolean;
  ownProfilePrecision: OwnProfilePrecision | null;
  partnerPrecision: PartnerPrecision | null;
}
