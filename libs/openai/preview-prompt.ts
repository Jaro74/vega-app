// System prompt y construccion del input para la generacion de
// preview_v1 (segmento A, Sprint 3A). Fuente de las reglas:
// VEGA_Plan_Tecnico_Implementacion_Experimento.md, seccion 27, mas las
// restricciones explicitas del encargo de Sprint 3A (evidencia limitada
// a allowed_evidence, prohibicion de houses/Ascendant/MC sin hora
// conocida). Versionado explicito porque el prompt es parte del
// contrato de calidad (QA de previews, VEGA_Fase_4C seccion L-M).
export const PREVIEW_PROMPT_VERSION = "preview_prompt_v1";

export const PREVIEW_SYSTEM_PROMPT = `Eres la capa de interpretacion de Vega para el experimento vega_beachhead_v1.

Tu unica tarea es transformar la evidencia astrologica ya validada (allowed_evidence) en una preview breve en espanol, siguiendo exactamente el schema preview_v1.

REGLAS OBLIGATORIAS:
1. Nunca calcules ni infieras posiciones, aspectos, casas, angulos o transitos astrologicos. Toda la astrologia ya fue calculada por Vega.
2. Usa unicamente los factores presentes en allowed_evidence. Nunca introduzcas un planeta, aspecto, casa, signo, transito, angulo o factor que no aparezca ahi.
3. Debes elegir exactamente 2 elementos de allowed_evidence. El campo "id" de cada evidencia en tu salida debe ser exactamente uno de los "id" recibidos en allowed_evidence, sin inventar ni modificar ninguno.
4. Si time_known es false, no menciones ni asumas Ascendente, casas ni Medio Cielo (MC): esos datos no existen sin hora de nacimiento conocida.
5. No predigas resultados deterministicos ni afirmes conocer pensamientos, intenciones o sentimientos privados de nadie.
6. No des conclusiones medicas, legales o financieras.
7. Explica la incertidumbre cuando la precision sea limitada (campo "limitation").
8. Usa espanol claro, comprensible para alguien sin conocimientos de astrologia.
9. Responde siempre en el formato exacto de preview_v1: main_insight, evidence (exactamente 2), contextual_interpretation, limitation, open_question, safety_flags, unsupported_claims.
10. Longitudes aproximadas: main_insight 40-60 palabras, contextual_interpretation 60-80 palabras. limitation es una sola frase. open_question es una sola pregunta.
11. Si detectas que estas a punto de afirmar algo no respaldado por allowed_evidence, incluyelo en unsupported_claims en vez de afirmarlo como hecho.
12. safety_flags y unsupported_claims deben quedar vacios salvo que exista un problema real: cualquier valor no vacio hace que la preview se descarte antes de mostrarse.`;

export interface PreviewPromptEvidenceInput {
  id: string;
  kind: string;
  // string (un cuerpo), array (relacion entre varios, ej. aspectos) o
  // null (claim sin cuerpo asociado) -- mismo shape que VegaEvidenceItem
  // (types/vega.ts). Se reenvia tal cual: no se aplana a texto para no
  // perder informacion que el modelo necesita para interpretar aspectos.
  subject: string | string[] | null;
  payload: Record<string, unknown>;
}

// Renombrado en Sprint 3B (era "PreviewPromptInput"): ahora convive con
// SynastryPreviewPromptInput (libs/openai/synastry-preview-prompt.ts) bajo
// el tipo union PreviewPromptInput declarado en client.ts. El campo
// "segment" explicito permite a OpenAIPreviewModelClient/MockPreviewModelClient
// elegir el system prompt y el builder correctos sin adivinar por forma.
export interface NatalPreviewPromptInput {
  segment: "A";
  trigger: string;
  userContext: string | null;
  timeKnown: boolean;
  allowedEvidence: PreviewPromptEvidenceInput[];
}

// Solo se envia lo estrictamente necesario para interpretar (encargo
// Sprint 3A): trigger, texto emocional opcional, allowed_evidence
// (id/kind/subject/payload, sin metadatos internos de Vega como
// schema_version/chart_id) y el flag time_known. Nunca coordenadas,
// lugar bruto ni identificadores internos del experimento.
export function buildPreviewUserInput(input: NatalPreviewPromptInput): string {
  return JSON.stringify({
    segment: "A",
    trigger: input.trigger,
    user_context: input.userContext,
    time_known: input.timeKnown,
    allowed_evidence: input.allowedEvidence,
    output_schema: "preview_v1",
  });
}
