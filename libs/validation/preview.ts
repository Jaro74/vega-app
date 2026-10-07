import { z } from "zod";

import type { PreviewGenerationErrorType, PreviewV1Output } from "@/types/preview";

// Shape estructural de preview_v1 (VEGA_Fase_4C, bloque I). El mapeo desde
// la respuesta cruda de OpenAI (snake_case, Structured Outputs) a este
// tipo camelCase se implementa en el sprint que integra OpenAI; aqui solo
// se congela el contrato y las reglas de validacion.
const evidenceRefSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  interpretationScope: z.string().optional(),
});

export const previewV1OutputSchema = z.object({
  mainInsight: z.string().min(1),
  evidence: z.tuple([evidenceRefSchema, evidenceRefSchema]),
  contextualInterpretation: z.string().min(1),
  limitation: z.string().min(1),
  openQuestion: z.string().min(1),
  safetyFlags: z.array(z.string()),
  unsupportedClaims: z.array(z.string()),
  insufficientEvidence: z.boolean(),
});

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// No rechazar por una desviacion minima de 1-2 palabras; si por una
// desviacion grande (VEGA_Fase_4C, bloque 32 del plan tecnico).
export function isWithinWordRange(text: string, min: number, max: number, tolerance = 5): boolean {
  const count = wordCount(text);
  return count >= min - tolerance && count <= max + tolerance;
}

export interface PreviewValidationResult {
  valid: boolean;
  errorType?: PreviewGenerationErrorType;
}

// Cada evidencia devuelta debe referenciar exactamente un id de
// allowed_evidence. Si el modelo alucina un factor, la preview es
// invalida y nunca se muestra (VEGA_Fase_4C, bloque I).
export function validatePreviewAgainstAllowedEvidence(
  output: PreviewV1Output,
  allowedEvidenceIds: readonly string[]
): PreviewValidationResult {
  const parsed = previewV1OutputSchema.safeParse(output);
  if (!parsed.success) {
    return { valid: false, errorType: "schema_invalid" };
  }

  if (output.unsupportedClaims.length > 0) {
    return { valid: false, errorType: "unsupported_evidence" };
  }

  if (output.safetyFlags.length > 0) {
    return { valid: false, errorType: "safety_failure" };
  }

  const allowedSet = new Set(allowedEvidenceIds);
  const evidenceIdsValid = output.evidence.every((item) => allowedSet.has(item.id));
  if (!evidenceIdsValid) {
    return { valid: false, errorType: "unsupported_evidence" };
  }

  return { valid: true };
}
