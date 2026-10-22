import type { ImpactIntensity, RelationshipFocus, UserEmotionalState } from "@/types/experiment";
import { RELATIONSHIP_FOCUS_OPTIONS, USER_EMOTIONAL_STATE_OPTIONS } from "@/types/experiment";

// Traduce el contexto estructurado de Segmento B (relationship_focus,
// user_emotional_state, impact_intensity) a frases neutrales en espanol
// para el campo user_context del prompt de sinastria -- sustituye por
// completo a problemContext.freeText, que Segmento B ya no tiene
// (encargo "eliminar free_text de Segmento B"). OpenAI nunca recibe
// free_text para B: este modulo es el unico punto que decide que texto
// llega al prompt.
//
// Cada frase esta formulada como objetivo/experiencia del USUARIO, nunca
// como un hecho sobre la Persona B -- ver la regla 16 de
// SYNASTRY_PREVIEW_SYSTEM_PROMPT (synastry-preview-prompt.ts), que exige
// exactamente esto del lado del modelo.
const RELATIONSHIP_FOCUS_PHRASES: Record<RelationshipFocus, string> = {
  communication: "El usuario quiere entender mejor cómo se comunican en esta relación.",
  emotional_closeness: "El usuario quiere entender mejor qué tan cerca o unidos se sienten en esta relación.",
  trust_security: "El usuario quiere entender mejor la confianza y la seguridad que siente en esta relación.",
  current_change: "El usuario quiere entender mejor un cambio que está viviendo esta relación ahora.",
  repeating_pattern: "El usuario quiere entender mejor un patrón que se repite en esta relación.",
  navigating_relationship: "El usuario quiere entender mejor cómo avanzar en esta relación.",
};

const USER_EMOTIONAL_STATE_PHRASES: Record<UserEmotionalState, string> = {
  confused: "El usuario se siente confundido/a respecto a esta relación.",
  insecure: "El usuario se siente inseguro/a respecto a esta relación.",
  distant: "El usuario se siente distante respecto a esta relación.",
  frustrated: "El usuario se siente frustrado/a respecto a esta relación.",
  blocked: "El usuario se siente bloqueado/a respecto a esta relación.",
  hopeful: "El usuario siente esperanza respecto a esta relación.",
  calm: "El usuario se siente en calma respecto a esta relación.",
  curious: "El usuario siente curiosidad respecto a esta relación.",
};

function isRelationshipFocus(value: string | null): value is RelationshipFocus {
  return value !== null && (RELATIONSHIP_FOCUS_OPTIONS as readonly string[]).includes(value);
}

function isUserEmotionalState(value: string | null): value is UserEmotionalState {
  return value !== null && (USER_EMOTIONAL_STATE_OPTIONS as readonly string[]).includes(value);
}

function isImpactIntensity(value: number | null): value is ImpactIntensity {
  return value !== null && Number.isInteger(value) && value >= 1 && value <= 5;
}

export interface StructuredUserContextInput {
  relationshipFocus: string | null;
  userEmotionalState: string | null;
  impactIntensity: number | null;
}

// Entradas sueltas (string | null / number | null, no los enums
// estrechos): problem_context llega de la capa de persistencia, que no
// valida pertenencia a un catalogo (misma convencion que `trigger` en
// libs/db/types.ts). Un valor que no pertenezca a ningun catalogo
// conocido se ignora en silencio, nunca se envia tal cual al prompt.
export function buildStructuredUserContext(input: StructuredUserContextInput): string | null {
  const parts: string[] = [];

  if (isRelationshipFocus(input.relationshipFocus)) {
    parts.push(RELATIONSHIP_FOCUS_PHRASES[input.relationshipFocus]);
  }
  if (isUserEmotionalState(input.userEmotionalState)) {
    parts.push(USER_EMOTIONAL_STATE_PHRASES[input.userEmotionalState]);
  }
  if (isImpactIntensity(input.impactIntensity)) {
    parts.push(`El usuario describe el impacto de esta situación en su vida ahora mismo como ${input.impactIntensity}/5.`);
  }

  return parts.length > 0 ? parts.join(" ") : null;
}
