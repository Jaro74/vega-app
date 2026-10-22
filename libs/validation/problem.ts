import { z } from "zod";

import { FREE_TEXT_MAX_LENGTH } from "@/libs/experiment/constants";
import {
  RELATIONSHIP_FOCUS_OPTIONS,
  TRIGGERS_A,
  TRIGGERS_B,
  USER_EMOTIONAL_STATE_OPTIONS,
  type Segment,
} from "@/types/experiment";

const ALL_TRIGGER_VALUES = Array.from(new Set<string>([...TRIGGERS_A, ...TRIGGERS_B])) as [
  string,
  ...string[],
];

// El schema solo comprueba que el trigger pertenece al catalogo
// congelado (A union B). Que pertenezca al segmento CORRECTO del
// flow_attempt es una regla de negocio, no de forma: se valida aparte
// con isTriggerValidForSegment (VEGA_Fase_4C, pantallas A1/B1).
// freeTextConsentGiven/freeTextConsentVersion son opcionales a nivel de
// forma (zod): la exigencia real -- obligatorios cuando freeText tiene
// contenido -- es una regla de negocio, no de forma, y se aplica en
// submitProblem (libs/experiment/onboarding-service.ts), igual que
// isTriggerValidForSegment de aqui abajo.
//
// relationshipFocus/userEmotionalState/impactIntensity (Segmento B,
// sustituyen al texto libre): tambien opcionales a nivel de forma -- que
// freeText* sea exclusivo de A y estos 3 exclusivo de B es, otra vez, una
// regla de negocio que depende del segmento REAL del flow_attempt, nunca
// de un valor del cliente, y se aplica en submitProblem.
export const problemRequestSchema = z.object({
  flowAttemptId: z.string().uuid(),
  trigger: z.enum(ALL_TRIGGER_VALUES),
  freeText: z.string().max(FREE_TEXT_MAX_LENGTH, "El texto supera el maximo de 1000 caracteres").optional(),
  freeTextConsentGiven: z.boolean().optional(),
  freeTextConsentVersion: z.string().optional(),
  relationshipFocus: z.enum(RELATIONSHIP_FOCUS_OPTIONS).optional(),
  userEmotionalState: z.enum(USER_EMOTIONAL_STATE_OPTIONS).optional(),
  impactIntensity: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
});

export type ProblemRequestInput = z.infer<typeof problemRequestSchema>;

export function isTriggerValidForSegment(segment: Segment, trigger: string): boolean {
  const allowed: readonly string[] = segment === "A" ? TRIGGERS_A : TRIGGERS_B;
  return allowed.includes(trigger);
}
