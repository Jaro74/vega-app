import type { PreviewGenerationErrorType, PreviewV1Output } from "@/types/preview";
import { isTimeDependentEvidenceItem } from "@/types/vega";
import type { VegaEvidenceItem } from "@/types/vega";

import { isWithinWordRange, validatePreviewAgainstAllowedEvidence } from "./preview";

export interface PreviewGenerationValidationResult {
  valid: boolean;
  errorType?: PreviewGenerationErrorType;
}

// Complementa isTimeDependentEvidenceItem (types/vega.ts, que mira
// kind/subject de la evidencia): esta lista detecta si el TEXTO en
// español generado por el modelo afirma usar un factor dependiente de
// hora, incluso si los IDs de evidencia referenciados fueran validos
// (defensa adicional, no sustituye la comprobacion por evidencia).
const FORBIDDEN_TIME_DEPENDENT_TEXT_PATTERNS = [/\bcasas?\b/i, /\bascendente\b/i, /\bmedio\s*cielo\b/i, /\bmc\b/i];

function mentionsTimeDependentFactor(text: string): boolean {
  return FORBIDDEN_TIME_DEPENDENT_TEXT_PATTERNS.some((pattern) => pattern.test(text));
}

// Validacion completa de un preview_v1 recien generado por OpenAI, antes
// de persistirlo o mostrarlo (encargo Sprint 3A, "Validacion post-
// OpenAI"). Compone la validacion ya congelada en Sprint 0
// (validatePreviewAgainstAllowedEvidence: schema, 2 evidencias, IDs
// autorizados, unsupported_claims, safety_flags) con dos comprobaciones
// nuevas de Sprint 3A: longitud aproximada y coherencia con time_known.
//
// El campo "limitation" se excluye deliberadamente del escaneo de texto:
// cuando time_known es false, el mensaje aprobado (VEGA_Fase_4C, bloque
// G) menciona explicitamente "casas" y "Ascendente" para explicar que NO
// se usaron; rechazar por esa mencion literal invertiria la regla.
export function validatePreviewForGeneration(
  output: PreviewV1Output,
  allowedEvidence: VegaEvidenceItem[],
  timeKnown: boolean
): PreviewGenerationValidationResult {
  const allowedIds = allowedEvidence.map((item) => item.id);
  const baseResult = validatePreviewAgainstAllowedEvidence(output, allowedIds);
  if (!baseResult.valid) return baseResult;

  if (!isWithinWordRange(output.mainInsight, 40, 60)) {
    return { valid: false, errorType: "schema_invalid" };
  }
  if (!isWithinWordRange(output.contextualInterpretation, 60, 80)) {
    return { valid: false, errorType: "schema_invalid" };
  }

  if (!timeKnown) {
    const evidenceById = new Map(allowedEvidence.map((item) => [item.id, item]));
    const usesTimeDependentEvidence = output.evidence.some((ref) => {
      const item = evidenceById.get(ref.id);
      return item ? isTimeDependentEvidenceItem(item) : false;
    });
    if (usesTimeDependentEvidence) {
      return { valid: false, errorType: "unsupported_evidence" };
    }

    const assertiveText = [
      output.mainInsight,
      output.contextualInterpretation,
      ...output.evidence.map((item) => `${item.label} ${item.interpretationScope ?? ""}`),
    ].join(" ");
    if (mentionsTimeDependentFactor(assertiveText)) {
      return { valid: false, errorType: "unsupported_evidence" };
    }
  }

  return { valid: true };
}
