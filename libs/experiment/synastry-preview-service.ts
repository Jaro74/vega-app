import type { PreviewModelClient } from "@/libs/openai/client";
import { SYNASTRY_PREVIEW_PROMPT_VERSION } from "@/libs/openai/synastry-preview-prompt";
import type { SynastryPreviewEvidenceInput } from "@/libs/openai/synastry-preview-prompt";
import { validateSynastryPreviewForGeneration } from "@/libs/validation/synastry-preview-generation";
import type { VegaSynastryClient } from "@/libs/vega/synastry-client";
import type { PreviewGenerationErrorType } from "@/types/preview";
import type {
  SynastryAspectType,
  VegaSynastryEvidenceItem,
  VegaSynastryRequest,
  VegaSynastryTimeContext,
  VegaSynastryVersions,
} from "@/types/synastry";

import type { ExperimentRepository, FlowAttemptRecord, PartnerDerivedFeatures } from "../db/types";
import type { GeneratePreviewOutcome } from "./preview-service";

// Mismo valor que PREVIEW_SCHEMA_VERSION (preview-service.ts): no se
// importa de alli para no crear un ciclo de modulos en runtime (ese
// archivo importa generateSynastryPreview de este). preview_v1 es
// segmento-agnostico (VEGA_Fase_4C, bloque I), asi que ambos archivos
// comparten el mismo literal por diseno, no por casualidad.
const PREVIEW_SCHEMA_VERSION = "preview_v1";

interface SynastryVegaOnlyFields {
  chartId: string | null;
  timeKnown: boolean | null;
  chartIdB: string | null;
  synastryFactsVersion: string | null;
  synastryClaimsVersion: string | null;
  synastryEvidenceSchemaVersion: string | null;
  timeKnownB: boolean | null;
}

function emptySynastryVegaFields(): SynastryVegaOnlyFields {
  return {
    chartId: null,
    timeKnown: null,
    chartIdB: null,
    synastryFactsVersion: null,
    synastryClaimsVersion: null,
    synastryEvidenceSchemaVersion: null,
    timeKnownB: null,
  };
}

interface SynastryOkFields {
  chartIdA: string;
  chartIdB: string;
  versions: VegaSynastryVersions;
  timeContext: VegaSynastryTimeContext;
}

function synastryVegaFieldsFrom(data: SynastryOkFields): SynastryVegaOnlyFields {
  return {
    chartId: data.chartIdA,
    timeKnown: data.timeContext.timeKnownA,
    chartIdB: data.chartIdB,
    synastryFactsVersion: data.versions.synastryFacts,
    synastryClaimsVersion: data.versions.synastryClaims,
    synastryEvidenceSchemaVersion: data.versions.synastryEvidenceSchema,
    timeKnownB: data.timeContext.timeKnownB,
  };
}

async function persistSynastryErrorPreview(
  repository: ExperimentRepository,
  attempt: FlowAttemptRecord,
  errorType: PreviewGenerationErrorType,
  vegaFields: SynastryVegaOnlyFields = emptySynastryVegaFields(),
  usedFreeText: boolean = false
): Promise<void> {
  await repository.createPreview({
    flowAttemptId: attempt.id,
    schemaVersion: PREVIEW_SCHEMA_VERSION,
    promptVersion: SYNASTRY_PREVIEW_PROMPT_VERSION,
    modelId: null,
    partnerPrecision: attempt.partnerPrecision,
    evidenceSchemaVersion: null,
    factsVersion: null,
    claimsVersion: null,
    ...vegaFields,
    evidenceIdsUsed: [],
    preview: null,
    generationStatus: "error",
    errorType,
    latencyMs: null,
    usedFreeText,
  });
}

async function persistInsufficientDataPreview(
  repository: ExperimentRepository,
  attempt: FlowAttemptRecord,
  vegaFields: SynastryVegaOnlyFields
): Promise<void> {
  await repository.createPreview({
    flowAttemptId: attempt.id,
    schemaVersion: PREVIEW_SCHEMA_VERSION,
    promptVersion: SYNASTRY_PREVIEW_PROMPT_VERSION,
    modelId: null,
    partnerPrecision: attempt.partnerPrecision,
    evidenceSchemaVersion: null,
    factsVersion: null,
    claimsVersion: null,
    ...vegaFields,
    evidenceIdsUsed: [],
    preview: null,
    generationStatus: "insufficient_data",
    errorType: null,
    latencyMs: null,
    // Nunca se llega a invocar a OpenAI en este camino (se corta antes,
    // por evidencia insuficiente), asi que el free_text nunca se envio.
    usedFreeText: false,
  });
}

function toSynastryEvidenceInput(items: VegaSynastryEvidenceItem[]): SynastryPreviewEvidenceInput[] {
  return items.map((item) => ({
    id: item.id,
    kind: item.kind,
    subject: { person_a_body: item.subject.personABody, person_b_body: item.subject.personBBody },
    aspectType: item.payload.type as SynastryAspectType,
    payload: item.payload,
  }));
}

// Deriva la evidencia de sinastria (llamando a Vega si hace falta) y la
// persiste en partner_derived_profile, o devuelve directamente el
// resultado ya cacheado de una llamada anterior (idempotencia: nunca
// repite una llamada a Vega para el mismo flow_attempt). Efecto lateral
// unico responsable del borrado de partner_input tras una derivacion
// correcta (VEGA_Plan_Tecnico, seccion 11): se borra justo despues de
// persistir partner_derived_profile, nunca antes.
type DeriveOutcome =
  | { kind: "ok"; features: Extract<PartnerDerivedFeatures, { status: "ok" }> }
  | { kind: "insufficient_data"; features: Extract<PartnerDerivedFeatures, { status: "insufficient_data" }> }
  | { kind: "error" };

async function deriveSynastryEvidence(
  repository: ExperimentRepository,
  synastryClient: VegaSynastryClient,
  attempt: FlowAttemptRecord
): Promise<DeriveOutcome> {
  const existing = await repository.getPartnerDerivedProfileByFlowAttempt(attempt.id);
  if (existing) {
    return existing.derivedFeatures.status === "ok"
      ? { kind: "ok", features: existing.derivedFeatures }
      : { kind: "insufficient_data", features: existing.derivedFeatures };
  }

  const profile = await repository.getOwnBirthProfileByUser(attempt.userId);
  const partnerInput = await repository.getPartnerInputByFlowAttempt(attempt.id);
  if (!profile || !partnerInput) {
    await persistSynastryErrorPreview(repository, attempt, "calculation_error");
    return { kind: "error" };
  }

  const request: VegaSynastryRequest = {
    requestId: crypto.randomUUID(),
    birthDataA: {
      birthDate: profile.birthDate,
      birthTime: profile.birthTime,
      birthTimeKnown: profile.birthTimeKnown,
      latitude: profile.latitude,
      longitude: profile.longitude,
      timezoneId: profile.timezoneId,
    },
    birthDataB: {
      birthDate: partnerInput.birthDate,
      birthTime: partnerInput.birthTime,
      birthTimeKnown: partnerInput.birthTimeKnown ?? false,
      latitude: partnerInput.latitude,
      longitude: partnerInput.longitude,
      timezoneId: partnerInput.timezoneId,
    },
  };

  const result = await synastryClient.fetchSynastryEvidence(request);
  if (!result.ok) {
    // Cualquier fallo de Vega (timeout, http, schema/version/provenance
    // invalidos, chart_id inconsistente, id de evidencia no
    // reconstruible, falsa precision...) es terminal: nunca se llama a
    // OpenAI con evidencia no confiable. partner_input se conserva para
    // permitir un reintento.
    await persistSynastryErrorPreview(repository, attempt, "calculation_error");
    return { kind: "error" };
  }

  const partnerPrecision = attempt.partnerPrecision ?? "minimal";

  if (result.data.status === "insufficient_data" || result.data.allowedEvidence.length < 2) {
    const features: Extract<PartnerDerivedFeatures, { status: "insufficient_data" }> =
      result.data.status === "insufficient_data"
        ? { status: "insufficient_data", reason: "participant_minimal", insufficientParticipants: result.data.insufficientParticipants }
        : { status: "insufficient_data", reason: "insufficient_evidence", insufficientParticipants: [] };

    await repository.upsertPartnerDerivedProfile({ flowAttemptId: attempt.id, partnerPrecision, derivedFeatures: features });
    await safeguardDeletePartnerInput(repository, attempt.id);

    const vegaFields =
      result.data.status === "ok"
        ? synastryVegaFieldsFrom(result.data)
        : emptySynastryVegaFields();
    await persistInsufficientDataPreview(repository, attempt, vegaFields);

    return { kind: "insufficient_data", features };
  }

  const features: Extract<PartnerDerivedFeatures, { status: "ok" }> = {
    status: "ok",
    chartIdA: result.data.chartIdA,
    chartIdB: result.data.chartIdB,
    versions: result.data.versions,
    timeContext: result.data.timeContext,
    precision: result.data.precision,
    allowedEvidence: result.data.allowedEvidence,
  };
  await repository.upsertPartnerDerivedProfile({ flowAttemptId: attempt.id, partnerPrecision, derivedFeatures: features });
  await safeguardDeletePartnerInput(repository, attempt.id);

  return { kind: "ok", features };
}

// El borrado de partner_input es una limpieza de privacidad, no una
// condicion de exito: si falla, la preview sigue adelante igualmente
// (expires_at a 24h y el job periodico son la defensa secundaria, VEGA_Plan_Tecnico
// seccion 11).
async function safeguardDeletePartnerInput(repository: ExperimentRepository, flowAttemptId: string): Promise<void> {
  try {
    await repository.deletePartnerInput(flowAttemptId);
  } catch {
    // Ver comentario de la funcion.
  }
}

// Orquesta el pipeline de Sprint 3B para el segmento B: partner_input ->
// Vega /evidence/synastry -> allowed_evidence -> validacion estricta ->
// OpenAI Structured Output -> preview_v1 relacional -> validacion de
// evidencia + roles + seguridad -> persistencia -> preview visible. Si
// Vega no puede construir una sinastria fiable (participante "minimal", o
// menos de 2 evidencias robustas), devuelve el resultado de dominio
// "insufficient_data": nunca se improvisa una preview a partir de las dos
// cartas natales por separado.
export async function generateSynastryPreview(
  repository: ExperimentRepository,
  synastryClient: VegaSynastryClient,
  openaiClient: PreviewModelClient,
  attempt: FlowAttemptRecord
): Promise<GeneratePreviewOutcome> {
  const existingValid = await repository.getValidPreviewByFlowAttempt(attempt.id);
  if (existingValid?.preview) {
    return { status: "valid", previewId: existingValid.id, preview: existingValid.preview };
  }

  const problemContext = await repository.getProblemContextByFlowAttempt(attempt.id);
  const trigger = problemContext?.trigger ?? attempt.trigger;
  if (!trigger) {
    await persistSynastryErrorPreview(repository, attempt, "calculation_error");
    return { status: "error", errorType: "calculation_error" };
  }

  const derived = await deriveSynastryEvidence(repository, synastryClient, attempt);
  if (derived.kind === "error") {
    return { status: "error", errorType: "calculation_error" };
  }
  if (derived.kind === "insufficient_data") {
    return {
      status: "insufficient_data",
      reason: derived.features.reason,
      insufficientParticipants: derived.features.insufficientParticipants,
    };
  }

  const evidence = derived.features;
  // Mismo criterio que preview-service.ts: fijado en el momento exacto
  // en que se decide que userContext se envia a OpenAI.
  const usedFreeText = Boolean(problemContext?.freeText && problemContext.freeText.trim() !== "");
  const modelResult = await openaiClient.generatePreview({
    segment: "B",
    trigger,
    userContext: problemContext?.freeText ?? null,
    userProfilePrecision: evidence.precision.a,
    partnerPrecision: evidence.precision.b,
    timeKnownA: evidence.timeContext.timeKnownA,
    timeKnownB: evidence.timeContext.timeKnownB,
    allowedEvidence: toSynastryEvidenceInput(evidence.allowedEvidence),
  });

  const vegaFields = synastryVegaFieldsFrom(evidence);

  if (modelResult.ok === false) {
    await persistSynastryErrorPreview(repository, attempt, modelResult.errorType, vegaFields, usedFreeText);
    return { status: "error", errorType: modelResult.errorType };
  }

  const validation = validateSynastryPreviewForGeneration(modelResult.output, {
    allowedEvidence: evidence.allowedEvidence,
    timeKnownA: evidence.timeContext.timeKnownA,
    timeKnownB: evidence.timeContext.timeKnownB,
  });
  const errorType = validation.valid ? null : validation.errorType ?? "unknown";

  const record = await repository.createPreview({
    flowAttemptId: attempt.id,
    schemaVersion: PREVIEW_SCHEMA_VERSION,
    promptVersion: SYNASTRY_PREVIEW_PROMPT_VERSION,
    modelId: modelResult.modelId,
    partnerPrecision: attempt.partnerPrecision,
    evidenceSchemaVersion: null,
    factsVersion: null,
    claimsVersion: null,
    ...vegaFields,
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
