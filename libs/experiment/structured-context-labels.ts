import type { RelationshipFocus, UserEmotionalState } from "@/types/experiment";

// Copy de Segmento B para el contexto estructurado (sustituye al
// textarea de texto libre). Cada etiqueta describe el objetivo o la
// experiencia del USUARIO, nunca una propiedad de la Persona B -- quien
// edite esta copy debe mantener ese mismo criterio.
export const RELATIONSHIP_FOCUS_LABELS: Record<RelationshipFocus, string> = {
  communication: "Cómo nos comunicamos",
  emotional_closeness: "Qué tan cerca nos sentimos",
  trust_security: "La confianza entre nosotros",
  current_change: "Un cambio que estamos viviendo",
  repeating_pattern: "Un patrón que se repite",
  navigating_relationship: "Cómo seguir adelante",
};

// Primera persona, inequívocamente: "Me siento..." / "Siento...", nunca
// una descripción de la otra persona.
export const USER_EMOTIONAL_STATE_LABELS: Record<UserEmotionalState, string> = {
  confused: "Me siento confundido/a",
  insecure: "Me siento inseguro/a",
  distant: "Me siento distante",
  frustrated: "Me siento frustrado/a",
  blocked: "Me siento bloqueado/a",
  hopeful: "Siento esperanza",
  calm: "Me siento en calma",
  curious: "Siento curiosidad",
};
