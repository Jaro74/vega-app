import type { SynastryAspectType, SynastryBody, SynastryParticipantPrecision } from "@/types/synastry";

// System prompt y construccion del input para la generacion de
// preview_v1 relacional (segmento B, Sprint 3B). Mismo schema publico
// preview_v1 que segmento A (VEGA_Fase_4C, bloque I: es segmento-agnostico),
// pero reglas de contenido propias para sinastria: roles A/B direccionales,
// ausencia de casas en v1, y prohibicion de falsa precision cuando algun
// participante es "partial". Versionado explicito, igual que
// PREVIEW_PROMPT_VERSION (natal), porque el prompt es parte del contrato
// de calidad (QA de previews).
export const SYNASTRY_PREVIEW_PROMPT_VERSION = "preview_prompt_b_v1";

export const SYNASTRY_PREVIEW_SYSTEM_PROMPT = `Eres la capa de interpretacion de Vega para el experimento vega_beachhead_v1, segmento B (sinastria/relaciones).

Tu unica tarea es transformar la evidencia de sinastria ya validada (allowed_evidence) en una preview relacional breve en espanol, siguiendo exactamente el schema preview_v1.

REGLAS OBLIGATORIAS:
1. Nunca calcules ni infieras aspectos, posiciones, casas o angulos astrologicos. Toda la astrologia ya fue calculada por Vega.
2. Usa unicamente los factores presentes en allowed_evidence. Nunca introduzcas un planeta, aspecto, angulo o factor que no aparezca ahi.
3. Debes elegir exactamente 2 elementos de allowed_evidence. El campo "id" de cada evidencia en tu salida debe ser exactamente uno de los "id" recibidos en allowed_evidence, sin inventar ni modificar ninguno.
4. Cada factor de allowed_evidence tiene subject.person_a_body (siempre pertenece a la persona que escribe, "tu") y subject.person_b_body (siempre pertenece a la otra persona, "su"/"la otra persona"). Nunca intercambies estos roles: un cuerpo de person_a_body nunca se describe como de la otra persona, y viceversa.
5. La sinastria v1 no incluye casas de ninguna de las dos personas: nunca menciones casas.
6. Si time_known_a es false, no menciones ni asumas Ascendente ni Medio Cielo (MC) de "tu" carta. Si time_known_b es false, no menciones ni asumas Ascendente ni Medio Cielo de la otra persona.
7. Solo puedes mencionar exactitud, orbe o grados de un aspecto si el payload de esa evidencia incluye el campo "exacto" u "orbe". Si esos campos no estan presentes (porque algun participante tiene precision "partial"), no afirmes ni un grado de precision aproximado: describe el aspecto sin cuantificarlo.
8. No des puntuaciones ni porcentajes de compatibilidad. No uses expresiones como "alma gemela" o "destinados". No predigas el futuro de la relacion ni afirmes conocer los sentimientos, pensamientos o intenciones privados de la otra persona.
9. No des conclusiones medicas, legales o financieras.
10. Explica la incertidumbre cuando la precision de alguno de los dos sea limitada (campo "limitation"): por ejemplo, que no se usan angulos de la persona cuya hora se desconoce.
11. Usa espanol claro, comprensible para alguien sin conocimientos de astrologia. Centra la interpretacion en la dinamica entre ambas personas, no en cada carta por separado.
12. Responde siempre en el formato exacto de preview_v1: main_insight, evidence (exactamente 2), contextual_interpretation, limitation, open_question, safety_flags, unsupported_claims.
13. Longitudes aproximadas: main_insight 40-60 palabras, contextual_interpretation 60-80 palabras. limitation es una sola frase. open_question es una sola pregunta.
14. Si detectas que estas a punto de afirmar algo no respaldado por allowed_evidence, incluyelo en unsupported_claims en vez de afirmarlo como hecho.
15. safety_flags y unsupported_claims deben quedar vacios salvo que exista un problema real: cualquier valor no vacio hace que la preview se descarte antes de mostrarse.`;

export interface SynastryPreviewEvidenceInput {
  id: string;
  kind: string;
  subject: { person_a_body: SynastryBody; person_b_body: SynastryBody };
  aspectType: SynastryAspectType;
  payload: Record<string, unknown>;
}

export interface SynastryPreviewPromptInput {
  segment: "B";
  trigger: string;
  userContext: string | null;
  userProfilePrecision: SynastryParticipantPrecision;
  partnerPrecision: SynastryParticipantPrecision;
  timeKnownA: boolean;
  timeKnownB: boolean;
  allowedEvidence: SynastryPreviewEvidenceInput[];
}

// Solo se envia lo estrictamente necesario para interpretar (encargo
// Sprint 3B, seccion 6): trigger, texto emocional opcional, precision de
// ambos participantes, flags time_known_a/b y allowed_evidence
// (id/kind/subject/aspect_type/payload, sin chart_id ni versiones
// internas de Vega). Nunca birth data, coordenadas, lugar ni
// identificadores internos del experimento.
export function buildSynastryPreviewUserInput(input: SynastryPreviewPromptInput): string {
  return JSON.stringify({
    segment: "B",
    trigger: input.trigger,
    user_context: input.userContext,
    user_profile_precision: input.userProfilePrecision,
    partner_precision: input.partnerPrecision,
    time_known_a: input.timeKnownA,
    time_known_b: input.timeKnownB,
    allowed_evidence: input.allowedEvidence.map((item) => ({
      id: item.id,
      kind: item.kind,
      subject: item.subject,
      aspect_type: item.aspectType,
      payload: item.payload,
    })),
    output_schema: "preview_v1",
  });
}
