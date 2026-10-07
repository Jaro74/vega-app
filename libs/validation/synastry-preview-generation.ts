import type { PreviewV1Output } from "@/types/preview";
import { isSynastryAngleBody } from "@/types/synastry";
import type { VegaSynastryEvidenceItem } from "@/types/synastry";

import type { PreviewGenerationValidationResult } from "./preview-generation";
import { isWithinWordRange, validatePreviewAgainstAllowedEvidence } from "./preview";
import {
  ASC_MC_PATTERN,
  A_ANGLE_ATTRIBUTION_PATTERN,
  B_ANGLE_ATTRIBUTION_PATTERN,
  EXACT_CLAIM_PATTERN,
  HOUSES_PATTERN,
  ORB_OR_DEGREES_PATTERN,
  OUT_OF_SCOPE_CLAIMS_PATTERN,
  SYNASTRY_BODY_SPANISH_NAMES,
  textAttributesBodyToA,
  textAttributesBodyToB,
} from "./synastry-text-patterns";

export interface SynastryValidationContext {
  allowedEvidence: VegaSynastryEvidenceItem[];
  timeKnownA: boolean;
  timeKnownB: boolean;
}

function assertiveTextOf(output: PreviewV1Output): string {
  // "limitation" se excluye deliberadamente (mismo criterio que
  // validatePreviewForGeneration, natal): el texto aprobado para
  // precision limitada menciona explicitamente Ascendente/casas/orbe para
  // explicar por que NO se usan, no para afirmarlos.
  return [
    output.mainInsight,
    output.contextualInterpretation,
    ...output.evidence.map((item) => `${item.label} ${item.interpretationScope ?? ""}`),
  ].join(" ");
}

// Validacion completa de un preview_v1 relacional recien generado por
// OpenAI, antes de persistirlo o mostrarlo (encargo Sprint 3B, seccion 7
// "Validacion post-generacion"). Compone la validacion base ya congelada
// (schema, 2 evidencias, IDs autorizados, unsupported_claims,
// safety_flags) con las comprobaciones propias de sinastria: longitud,
// IDs de evidencia distintos entre si, angulos solo para el participante
// con hora conocida, ausencia de casas (siempre, sinastria v1 no las
// tiene), ausencia de falsa precision cuando el payload no la respalda,
// ausencia de intercambio de roles A/B, y ausencia de afirmaciones
// relacionales fuera de alcance (scores, "alma gemela", prediccion).
export function validateSynastryPreviewForGeneration(
  output: PreviewV1Output,
  ctx: SynastryValidationContext
): PreviewGenerationValidationResult {
  const allowedIds = ctx.allowedEvidence.map((item) => item.id);
  const baseResult = validatePreviewAgainstAllowedEvidence(output, allowedIds);
  if (!baseResult.valid) return baseResult;

  const [firstRef, secondRef] = output.evidence;
  if (firstRef.id === secondRef.id) {
    return { valid: false, errorType: "unsupported_evidence" };
  }

  if (!isWithinWordRange(output.mainInsight, 40, 60)) {
    return { valid: false, errorType: "schema_invalid" };
  }
  if (!isWithinWordRange(output.contextualInterpretation, 60, 80)) {
    return { valid: false, errorType: "schema_invalid" };
  }

  const evidenceById = new Map(ctx.allowedEvidence.map((item) => [item.id, item]));
  const chosen = output.evidence
    .map((ref) => evidenceById.get(ref.id))
    .filter((item): item is VegaSynastryEvidenceItem => Boolean(item));

  for (const item of chosen) {
    if (isSynastryAngleBody(item.subject.personABody) && !ctx.timeKnownA) {
      return { valid: false, errorType: "unsupported_evidence" };
    }
    if (isSynastryAngleBody(item.subject.personBBody) && !ctx.timeKnownB) {
      return { valid: false, errorType: "unsupported_evidence" };
    }
  }

  const text = assertiveTextOf(output);

  if (HOUSES_PATTERN.test(text)) {
    return { valid: false, errorType: "unsupported_evidence" };
  }

  const hasChosenAngleBody = chosen.some(
    (item) => isSynastryAngleBody(item.subject.personABody) || isSynastryAngleBody(item.subject.personBBody)
  );
  if (ASC_MC_PATTERN.test(text) && !hasChosenAngleBody) {
    return { valid: false, errorType: "unsupported_evidence" };
  }
  if (!ctx.timeKnownA && A_ANGLE_ATTRIBUTION_PATTERN.test(text)) {
    return { valid: false, errorType: "unsupported_evidence" };
  }
  if (!ctx.timeKnownB && B_ANGLE_ATTRIBUTION_PATTERN.test(text)) {
    return { valid: false, errorType: "unsupported_evidence" };
  }

  const hasExactSupport = chosen.some((item) => item.payload.exacto === true);
  if (EXACT_CLAIM_PATTERN.test(text) && !hasExactSupport) {
    return { valid: false, errorType: "unsupported_evidence" };
  }
  const hasOrbSupport = chosen.some((item) => item.payload.orbe !== undefined);
  if (ORB_OR_DEGREES_PATTERN.test(text) && !hasOrbSupport) {
    return { valid: false, errorType: "unsupported_evidence" };
  }

  if (roleSwapDetected(text, chosen)) {
    return { valid: false, errorType: "unsupported_evidence" };
  }

  if (OUT_OF_SCOPE_CLAIMS_PATTERN.test(text)) {
    return { valid: false, errorType: "unsupported_evidence" };
  }

  return { valid: true };
}

// Cuerpos que en la evidencia elegida solo aparecen del lado A (nunca del
// lado B) no deben describirse en el texto como "su <cuerpo>"; y
// viceversa. Un cuerpo que aparece en ambos lados de algun item (ej.
// Venus/Venus) es ambiguo por diseno y se omite de la comprobacion.
function roleSwapDetected(text: string, chosen: VegaSynastryEvidenceItem[]): boolean {
  const bodiesA = new Set(chosen.map((item) => item.subject.personABody));
  const bodiesB = new Set(chosen.map((item) => item.subject.personBBody));
  const onlyA = [...bodiesA].filter((body) => !bodiesB.has(body));
  const onlyB = [...bodiesB].filter((body) => !bodiesA.has(body));

  for (const body of onlyA) {
    const names = SYNASTRY_BODY_SPANISH_NAMES[body];
    if (names.some((name) => textAttributesBodyToB(text, name))) return true;
  }
  for (const body of onlyB) {
    const names = SYNASTRY_BODY_SPANISH_NAMES[body];
    if (names.some((name) => textAttributesBodyToA(text, name))) return true;
  }
  return false;
}
