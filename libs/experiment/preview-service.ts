import type { PreviewModelClient } from "@/libs/openai/client";
import { PREVIEW_PROMPT_VERSION } from "@/libs/openai/preview-prompt";
import type { PreviewPromptEvidenceInput } from "@/libs/openai/preview-prompt";
import { validatePreviewForGeneration } from "@/libs/validation/preview-generation";
import type { VegaEvidenceClient } from "@/libs/vega/client";
import type { VegaSynastryClient } from "@/libs/vega/synastry-client";
import type { PreviewGenerationErrorType, PreviewV1Output } from "@/types/preview";
import type { SynastryParticipant } from "@/types/synastry";
import type { VegaEvidenceItem, VegaNatalRequest, VegaNatalResponse } from "@/types/vega";

import type { ExperimentRepository } from "../db/types";

import { generateSynastryPreview } from "./synastry-preview-service";

export const PREVIEW_SCHEMA_VERSION = "preview_v1";

export type GeneratePreviewOutcome =
  | { status: "not_found" }
  | { status: "valid"; previewId: string; preview: PreviewV1Output }
  | { status: "error"; errorType: PreviewGenerationErrorType }
  | {
      status: "insufficient_data";
      reason: "participant_minimal" | "insufficient_evidence";
      insufficientParticipants: SynastryParticipant[];
    };

interface VegaOnlyFields {
  chartId: string | null;
  evidenceSchemaVersion: string | null;
  factsVersion: string | null;
  claimsVersion: string | null;
  timeKnown: boolean | null;
}

function emptyVegaFields(): VegaOnlyFields {
  return { chartId: null, evidenceSchemaVersion: null, factsVersion: null, claimsVersion: null, timeKnown: null };
}

function vegaFieldsFrom(data: VegaNatalResponse): VegaOnlyFields {
  return {
    chartId: data.chartId,
    evidenceSchemaVersion: data.versions.evidenceSchema,
    factsVersion: data.versions.facts,
    claimsVersion: data.versions.claims,
    timeKnown: data.timeContext.timeKnown,
  };
}

function toEvidenceInput(items: VegaEvidenceItem[]): PreviewPromptEvidenceInput[] {
  return items.map((item) => ({ id: item.id, kind: item.kind, subject: item.subject, payload: item.payload }));
}

async function persistErrorPreview(
  repository: ExperimentRepository,
  flowAttemptId: string,
  errorType: PreviewGenerationErrorType,
  vegaFields: VegaOnlyFields = emptyVegaFields(),
  usedFreeText: boolean = false
): Promise<void> {
  await repository.createPreview({
    flowAttemptId,
    schemaVersion: PREVIEW_SCHEMA_VERSION,
    promptVersion: PREVIEW_PROMPT_VERSION,
    modelId: null,
    partnerPrecision: null,
    ...vegaFields,
    evidenceIdsUsed: [],
    preview: null,
    generationStatus: "error",
    errorType,
    latencyMs: null,
    usedFreeText,
  });
}

// Orquesta el pipeline completo de Sprint 3A para el segmento A:
// onboarding_complete -> Vega /evidence/natal -> allowed_evidence ->
// validacion estricta -> OpenAI Structured Output -> preview_v1 ->
// validacion de evidencia + seguridad -> persistencia -> preview visible.
//
// Segmento B (Sprint 3B): delega en generateSynastryPreview
// (synastry-preview-service.ts), que sigue el mismo patron pero con
// /evidence/synastry, el cache de partner_derived_profile y el resultado
// de dominio "insufficient_data" (nunca un preview B improvisado a partir
// del natal individual).
//
// Idempotente: si ya existe una preview valida para este flow_attempt_id,
// se devuelve directamente sin volver a llamar a Vega/OpenAI.
export async function generatePreviewForFlowAttempt(
  repository: ExperimentRepository,
  vegaClient: VegaEvidenceClient,
  openaiClient: PreviewModelClient,
  synastryClient: VegaSynastryClient,
  flowAttemptId: string
): Promise<GeneratePreviewOutcome> {
  const attempt = await repository.getFlowAttemptById(flowAttemptId);
  if (!attempt) return { status: "not_found" };

  if (attempt.segment === "B") {
    return generateSynastryPreview(repository, synastryClient, openaiClient, attempt);
  }

  const existingValid = await repository.getValidPreviewByFlowAttempt(flowAttemptId);
  if (existingValid?.preview) {
    return { status: "valid", previewId: existingValid.id, preview: existingValid.preview };
  }

  const profile = await repository.getOwnBirthProfileByUser(attempt.userId);
  if (!profile) {
    await persistErrorPreview(repository, flowAttemptId, "calculation_error");
    return { status: "error", errorType: "calculation_error" };
  }

  const problemContext = await repository.getProblemContextByFlowAttempt(flowAttemptId);
  const trigger = problemContext?.trigger ?? attempt.trigger;
  if (!trigger) {
    await persistErrorPreview(repository, flowAttemptId, "calculation_error");
    return { status: "error", errorType: "calculation_error" };
  }

  const vegaRequest: VegaNatalRequest = {
    requestId: crypto.randomUUID(),
    birthData: {
      birthDate: profile.birthDate,
      birthTime: profile.birthTime,
      birthTimeKnown: profile.birthTimeKnown,
      latitude: profile.latitude,
      longitude: profile.longitude,
      timezoneId: profile.timezoneId,
    },
  };

  const vegaResult = await vegaClient.fetchNatalEvidence(vegaRequest);
  if (!vegaResult.ok) {
    // Cualquier fallo de Vega (timeout, http, schema/version/provenance
    // invalidos, chart_id inconsistente...) es terminal: nunca se llama a
    // OpenAI con evidencia no confiable (encargo Sprint 3A).
    await persistErrorPreview(repository, flowAttemptId, "calculation_error");
    return { status: "error", errorType: "calculation_error" };
  }

  const vegaData = vegaResult.data;
  if (vegaData.allowedEvidence.length < 2) {
    await persistErrorPreview(repository, flowAttemptId, "calculation_error", vegaFieldsFrom(vegaData));
    return { status: "error", errorType: "calculation_error" };
  }

  // Fijado en el momento exacto en que se decide que userContext se
  // envia a OpenAI -- nunca se recalcula despues a partir del estado
  // actual de problem_context, que puede cambiar o borrarse mas
  // adelante (retirada de consentimiento, purga por retencion).
  const usedFreeText = Boolean(problemContext?.freeText && problemContext.freeText.trim() !== "");

  const modelResult = await openaiClient.generatePreview({
    segment: "A",
    trigger,
    userContext: problemContext?.freeText ?? null,
    timeKnown: vegaData.timeContext.timeKnown,
    allowedEvidence: toEvidenceInput(vegaData.allowedEvidence),
  });

  if (modelResult.ok === false) {
    await persistErrorPreview(repository, flowAttemptId, modelResult.errorType, vegaFieldsFrom(vegaData), usedFreeText);
    return { status: "error", errorType: modelResult.errorType };
  }

  const validation = validatePreviewForGeneration(modelResult.output, vegaData.allowedEvidence, vegaData.timeContext.timeKnown);
  const errorType = validation.valid ? null : validation.errorType ?? "unknown";

  const record = await repository.createPreview({
    flowAttemptId,
    schemaVersion: PREVIEW_SCHEMA_VERSION,
    promptVersion: PREVIEW_PROMPT_VERSION,
    modelId: modelResult.modelId,
    partnerPrecision: null,
    ...vegaFieldsFrom(vegaData),
    evidenceIdsUsed: modelResult.output.evidence.map((item) => item.id),
    preview: modelResult.output,
    generationStatus: validation.valid ? "valid" : "invalid",
    errorType,
    latencyMs: modelResult.latencyMs,
    usedFreeText,
  });

  if (!validation.valid) {
    return { status: "error", errorType: errorType ?? "unknown" };
  }

  return { status: "valid", previewId: record.id, preview: modelResult.output };
}
