import type { PreviewV1Output } from "@/types/preview";

import type { PreviewV1Wire } from "./preview-schema";
import type { NatalPreviewPromptInput } from "./preview-prompt";
import type { SynastryPreviewPromptInput } from "./synastry-preview-prompt";

// Union por segmento (Sprint 3B): el campo "segment" discrimina que
// system prompt y que builder de input usar (ver http-client.ts /
// mock-client.ts). preview_v1 (el schema de salida) es el mismo para
// ambos segmentos; lo que cambia es unicamente el prompt/input de entrada.
export type PreviewPromptInput = NatalPreviewPromptInput | SynastryPreviewPromptInput;

// error_type del catalogo congelado (VEGA_Fase_4C, bloque J) que puede
// originarse en esta capa. "schema_invalid" cubre tanto una respuesta que
// no es JSON valido como una que no cumple preview_v1 estructuralmente.
export type PreviewModelErrorType = "llm_timeout" | "schema_invalid" | "unknown";

export type PreviewModelResult =
  | { ok: true; output: PreviewV1Output; latencyMs: number; modelId: string }
  | { ok: false; errorType: PreviewModelErrorType; detail?: string };

export interface PreviewModelClient {
  generatePreview(input: PreviewPromptInput): Promise<PreviewModelResult>;
}

// Mapeo wire (snake_case, forma exacta pedida a OpenAI) -> forma interna
// camelCase ya congelada en Sprint 0 (types/preview.ts). insufficientEvidence
// no se le pide al modelo (el schema de Sprint 3A no lo incluye): el caso
// "evidencia insuficiente" se resuelve antes de llamar a OpenAI, cuando
// Vega no entrega al menos 2 evidencias validas (ver preview-service.ts).
export function wireToPreviewV1Output(wire: PreviewV1Wire): PreviewV1Output {
  return {
    mainInsight: wire.main_insight,
    evidence: [
      {
        id: wire.evidence[0].id,
        label: wire.evidence[0].label,
        interpretationScope: wire.evidence[0].interpretation_scope,
      },
      {
        id: wire.evidence[1].id,
        label: wire.evidence[1].label,
        interpretationScope: wire.evidence[1].interpretation_scope,
      },
    ],
    contextualInterpretation: wire.contextual_interpretation,
    limitation: wire.limitation,
    openQuestion: wire.open_question,
    safetyFlags: wire.safety_flags,
    unsupportedClaims: wire.unsupported_claims,
    insufficientEvidence: false,
  };
}
