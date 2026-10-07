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
