// Contratos de preview (schema preview_v1).
// Fuente: VEGA_Fase_4C_Especificacion_Final_Experimento.md (bloques G-J)
//         VEGA_Plan_Tecnico_Implementacion_Experimento.md (secciones 21-29)
//
// Las formas especulativas de Sprint 0 para el input del motor Vega
// (VegaRequestA/VegaRequestB/VegaResponseA/VegaResponseB/AllowedEvidenceItem/
// PreviewModelInput/VegaAnalysisNotViable) se retiraron en Sprint 3B: el
// contrato real, verificado contra Railway, vive en types/vega.ts (natal,
// Sprint 3A) y types/synastry.ts (sinastria, Sprint 3B). Ninguna de esas
// formas especulativas llego a usarse fuera de este archivo.

export interface PreviewEvidenceRef {
  id: string;
  label: string;
  interpretationScope?: string;
}

// Salida estructurada exigida al modelo (Structured Outputs, JSON Schema estricto).
export interface PreviewV1Output {
  mainInsight: string;
  evidence: [PreviewEvidenceRef, PreviewEvidenceRef];
  contextualInterpretation: string;
  limitation: string;
  openQuestion: string;
  safetyFlags: string[];
  unsupportedClaims: string[];
  insufficientEvidence: boolean;
}

export const PREVIEW_GENERATION_ERROR_TYPES = [
  "calculation_error",
  "llm_timeout",
  "schema_invalid",
  "unsupported_evidence",
  "safety_failure",
  "unknown",
] as const;

export type PreviewGenerationErrorType = (typeof PREVIEW_GENERATION_ERROR_TYPES)[number];

// "insufficient_data" (Sprint 3B): resultado de dominio propio del
// segmento B cuando Vega no puede construir una sinastria fiable
// (participante "minimal", o menos de 2 evidencias robustas). No es un
// error tecnico -- nunca usa PreviewGenerationErrorType -- por eso es un
// valor mas de generationStatus, no una rama de "error".
export type PreviewGenerationStatus = "valid" | "invalid" | "error" | "insufficient_data";
