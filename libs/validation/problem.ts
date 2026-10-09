import { z } from "zod";

import { FREE_TEXT_MAX_LENGTH } from "@/libs/experiment/constants";
import { TRIGGERS_A, TRIGGERS_B, type Segment } from "@/types/experiment";

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
export const problemRequestSchema = z.object({
  flowAttemptId: z.string().uuid(),
  trigger: z.enum(ALL_TRIGGER_VALUES),
  freeText: z.string().max(FREE_TEXT_MAX_LENGTH, "El texto supera el maximo de 1000 caracteres").optional(),
  freeTextConsentGiven: z.boolean().optional(),
  freeTextConsentVersion: z.string().optional(),
});

export type ProblemRequestInput = z.infer<typeof problemRequestSchema>;

export function isTriggerValidForSegment(segment: Segment, trigger: string): boolean {
  const allowed: readonly string[] = segment === "A" ? TRIGGERS_A : TRIGGERS_B;
  return allowed.includes(trigger);
}
