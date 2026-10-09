import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Segment } from "@/types/experiment";

import type {
  CreateFlowAttemptInput,
  CreateIfNotExistsResult,
  CreatePreviewInput,
  CreatePricedAccessIntentInput,
  CreateWaitlistEntryInput,
  ExperimentRepository,
  ExperimentUserRecord,
  FindOrCreateUserInput,
  FlowAttemptRecord,
  PartnerDerivedFeatures,
  PartnerDerivedProfileRecord,
  PartnerInputRecord,
  PreviewRecord,
  PricedAccessIntentRecord,
  ProblemContextRecord,
  SubmitProblemContextWithFreeTextInput,
  SubmitProblemContextWithFreeTextResult,
  UpdateFlowAttemptProgressInput,
  UpsertOwnBirthProfileInput,
  UpsertPartnerDerivedProfileInput,
  UpsertPartnerInputInput,
  UpsertProblemContextInput,
  UserBirthProfileRecord,
  WaitlistRecord,
  WithdrawFreeTextConsentResult,
} from "./types";
import { UniqueConstraintViolationError } from "./types";

const POSTGRES_UNIQUE_VIOLATION = "23505";

interface ExperimentUserRow {
  id: string;
  anonymous_user_id: string;
  experiment_id: string;
  first_seen_at: string;
  last_seen_at: string;
  traffic_source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  placement: string | null;
  device_type: string | null;
  is_test: boolean;
}

interface FlowAttemptRow {
  id: string;
  user_id: string;
  segment: string;
  trigger: string | null;
  current_step: string | null;
  partner_precision: string | null;
  is_primary_attempt: boolean;
  started_at: string;
  completed_at: string | null;
}

function toExperimentUserRecord(row: ExperimentUserRow): ExperimentUserRecord {
  return {
    id: row.id,
    anonymousUserId: row.anonymous_user_id,
    experimentId: row.experiment_id,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    isTest: row.is_test,
    acquisition: {
      trafficSource: row.traffic_source,
      utmSource: row.utm_source,
      utmMedium: row.utm_medium,
      utmCampaign: row.utm_campaign,
      utmContent: row.utm_content,
      placement: row.placement,
      deviceType: row.device_type,
    },
  };
}

function toFlowAttemptRecord(row: FlowAttemptRow): FlowAttemptRecord {
  return {
    id: row.id,
    userId: row.user_id,
    segment: row.segment as Segment,
    trigger: row.trigger,
    currentStep: row.current_step,
    partnerPrecision: row.partner_precision as FlowAttemptRecord["partnerPrecision"],
    isPrimaryAttempt: row.is_primary_attempt,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

interface ProblemContextRow {
  id: string;
  flow_attempt_id: string;
  trigger: string;
  free_text: string | null;
  text_provided: boolean;
  created_at: string;
}

function toProblemContextRecord(row: ProblemContextRow): ProblemContextRecord {
  return {
    id: row.id,
    flowAttemptId: row.flow_attempt_id,
    trigger: row.trigger,
    freeText: row.free_text,
    textProvided: row.text_provided,
    createdAt: row.created_at,
  };
}

interface UserBirthProfileRow {
  id: string;
  user_id: string;
  birth_date: string;
  birth_time: string | null;
  birth_time_known: boolean;
  place_label: string;
  country_code: string;
  latitude: number;
  longitude: number;
  timezone_id: string;
  created_at: string;
  updated_at: string;
}

function toUserBirthProfileRecord(row: UserBirthProfileRow): UserBirthProfileRecord {
  return {
    id: row.id,
    userId: row.user_id,
    birthDate: row.birth_date,
    birthTime: row.birth_time,
    birthTimeKnown: row.birth_time_known,
    placeLabel: row.place_label,
    countryCode: row.country_code,
    latitude: row.latitude,
    longitude: row.longitude,
    timezoneId: row.timezone_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface PartnerInputRow {
  id: string;
  flow_attempt_id: string;
  birth_date: string;
  birth_time: string | null;
  birth_time_known: boolean | null;
  place_label: string | null;
  country_code: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone_id: string | null;
  created_at: string;
  expires_at: string;
}

function toPartnerInputRecord(row: PartnerInputRow): PartnerInputRecord {
  return {
    id: row.id,
    flowAttemptId: row.flow_attempt_id,
    birthDate: row.birth_date,
    birthTime: row.birth_time,
    birthTimeKnown: row.birth_time_known,
    placeLabel: row.place_label,
    countryCode: row.country_code,
    latitude: row.latitude,
    longitude: row.longitude,
    timezoneId: row.timezone_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

interface PreviewRow {
  id: string;
  flow_attempt_id: string;
  schema_version: string;
  prompt_version: string;
  model_id: string | null;
  partner_precision: string | null;
  chart_id: string | null;
  evidence_schema_version: string | null;
  facts_version: string | null;
  claims_version: string | null;
  time_known: boolean | null;
  chart_id_b: string | null;
  synastry_facts_version: string | null;
  synastry_claims_version: string | null;
  synastry_evidence_schema_version: string | null;
  time_known_b: boolean | null;
  evidence_ids_used: string[];
  preview_json: PreviewRecord["preview"];
  generation_status: PreviewRecord["generationStatus"];
  error_type: PreviewRecord["errorType"];
  latency_ms: number | null;
  used_free_text: boolean;
  created_at: string;
}

function toPreviewRecord(row: PreviewRow): PreviewRecord {
  return {
    id: row.id,
    flowAttemptId: row.flow_attempt_id,
    schemaVersion: row.schema_version,
    promptVersion: row.prompt_version,
    modelId: row.model_id,
    partnerPrecision: row.partner_precision as PreviewRecord["partnerPrecision"],
    chartId: row.chart_id,
    evidenceSchemaVersion: row.evidence_schema_version,
    factsVersion: row.facts_version,
    claimsVersion: row.claims_version,
    timeKnown: row.time_known,
    chartIdB: row.chart_id_b,
    synastryFactsVersion: row.synastry_facts_version,
    synastryClaimsVersion: row.synastry_claims_version,
    synastryEvidenceSchemaVersion: row.synastry_evidence_schema_version,
    timeKnownB: row.time_known_b,
    evidenceIdsUsed: row.evidence_ids_used ?? [],
    preview: row.preview_json,
    generationStatus: row.generation_status,
    errorType: row.error_type,
    latencyMs: row.latency_ms,
    usedFreeText: row.used_free_text,
    createdAt: row.created_at,
  };
}

interface PartnerDerivedProfileRow {
  id: string;
  flow_attempt_id: string;
  partner_precision: string;
  derived_features: PartnerDerivedFeatures;
  created_at: string;
  delete_after: string;
}

function toPartnerDerivedProfileRecord(row: PartnerDerivedProfileRow): PartnerDerivedProfileRecord {
  return {
    id: row.id,
    flowAttemptId: row.flow_attempt_id,
    partnerPrecision: row.partner_precision as PartnerDerivedProfileRecord["partnerPrecision"],
    derivedFeatures: row.derived_features,
    createdAt: row.created_at,
    deleteAfter: row.delete_after,
  };
}

interface PricedAccessIntentRow {
  id: string;
  flow_attempt_id: string;
  price_minor: number;
  currency: string;
  created_at: string;
}

function toPricedAccessIntentRecord(row: PricedAccessIntentRow): PricedAccessIntentRecord {
  return {
    id: row.id,
    flowAttemptId: row.flow_attempt_id,
    priceMinor: row.price_minor,
    currency: row.currency,
    createdAt: row.created_at,
  };
}

interface WaitlistRow {
  id: string;
  flow_attempt_id: string;
  email: string;
  consent_version: string;
  confirmation_status: WaitlistRecord["confirmationStatus"];
  created_at: string;
}

function toWaitlistRecord(row: WaitlistRow): WaitlistRecord {
  return {
    id: row.id,
    flowAttemptId: row.flow_attempt_id,
    email: row.email,
    consentVersion: row.consent_version,
    confirmationStatus: row.confirmation_status,
    createdAt: row.created_at,
  };
}

// Implementacion real: Postgres via supabase-js, usando la service role
// key server-side (libs/db/supabase-admin.ts). Requiere un proyecto
// Supabase con las migraciones de supabase/migrations/ aplicadas.
export class SupabaseExperimentRepository implements ExperimentRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findOrCreateExperimentUser(input: FindOrCreateUserInput): Promise<ExperimentUserRecord> {
    const existing = await this.getExperimentUserByAnonymousId(input.anonymousUserId);
    if (existing) {
      const { data, error } = await this.client
        .from("experiment_users")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single<ExperimentUserRow>();

      if (error || !data) {
        // Un fallo al actualizar last_seen_at no debe romper el flujo:
        // devolvemos el usuario ya conocido.
        return existing;
      }
      return toExperimentUserRecord(data);
    }

    const { data, error } = await this.client
      .from("experiment_users")
      .insert({
        anonymous_user_id: input.anonymousUserId,
        experiment_id: input.experimentId,
        traffic_source: input.acquisition.trafficSource,
        utm_source: input.acquisition.utmSource,
        utm_medium: input.acquisition.utmMedium,
        utm_campaign: input.acquisition.utmCampaign,
        utm_content: input.acquisition.utmContent,
        placement: input.acquisition.placement,
        device_type: input.acquisition.deviceType,
        is_test: input.isTest,
      })
      .select()
      .single<ExperimentUserRow>();

    if (error) {
      if (error.code === POSTGRES_UNIQUE_VIOLATION) {
        const raceWinner = await this.getExperimentUserByAnonymousId(input.anonymousUserId);
        if (raceWinner) return raceWinner;
      }
      throw new Error(`No se pudo crear experiment_users: ${error.message}`);
    }

    return toExperimentUserRecord(data);
  }

  async getExperimentUserByAnonymousId(anonymousUserId: string): Promise<ExperimentUserRecord | null> {
    const { data, error } = await this.client
      .from("experiment_users")
      .select()
      .eq("anonymous_user_id", anonymousUserId)
      .maybeSingle<ExperimentUserRow>();

    if (error) {
      throw new Error(`No se pudo consultar experiment_users: ${error.message}`);
    }
    return data ? toExperimentUserRecord(data) : null;
  }

  async countFlowAttemptsForUser(userId: string): Promise<number> {
    const { count, error } = await this.client
      .from("flow_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) {
      throw new Error(`No se pudo contar flow_attempts: ${error.message}`);
    }
    return count ?? 0;
  }

  async getFlowAttemptById(id: string): Promise<FlowAttemptRecord | null> {
    const { data, error } = await this.client
      .from("flow_attempts")
      .select()
      .eq("id", id)
      .maybeSingle<FlowAttemptRow>();

    if (error) {
      throw new Error(`No se pudo consultar flow_attempts: ${error.message}`);
    }
    return data ? toFlowAttemptRecord(data) : null;
  }

  async getPrimaryFlowAttempt(userId: string): Promise<FlowAttemptRecord | null> {
    const { data, error } = await this.client
      .from("flow_attempts")
      .select()
      .eq("user_id", userId)
      .eq("is_primary_attempt", true)
      .maybeSingle<FlowAttemptRow>();

    if (error) {
      throw new Error(`No se pudo consultar el intento primario: ${error.message}`);
    }
    return data ? toFlowAttemptRecord(data) : null;
  }

  async listFlowAttemptsForUser(userId: string): Promise<FlowAttemptRecord[]> {
    const { data, error } = await this.client
      .from("flow_attempts")
      .select()
      .eq("user_id", userId)
      .returns<FlowAttemptRow[]>();

    if (error) {
      throw new Error(`No se pudo listar flow_attempts: ${error.message}`);
    }
    return (data ?? []).map(toFlowAttemptRecord);
  }

  async createFlowAttempt(input: CreateFlowAttemptInput): Promise<FlowAttemptRecord> {
    const attemptCount = await this.countFlowAttemptsForUser(input.userId);
    const isPrimaryAttempt = attemptCount === 0;

    const { data, error } = await this.client
      .from("flow_attempts")
      .insert({
        user_id: input.userId,
        segment: input.segment,
        is_primary_attempt: isPrimaryAttempt,
      })
      .select()
      .single<FlowAttemptRow>();

    if (error) {
      if (error.code === POSTGRES_UNIQUE_VIOLATION) {
        throw new UniqueConstraintViolationError(
          "Ya existe un intento primario para este usuario (constraint only_one_primary_attempt)."
        );
      }
      throw new Error(`No se pudo crear flow_attempts: ${error.message}`);
    }

    return toFlowAttemptRecord(data);
  }

  async updateFlowAttemptProgress(input: UpdateFlowAttemptProgressInput): Promise<FlowAttemptRecord> {
    const patch: Record<string, unknown> = {};
    if (input.trigger !== undefined) patch.trigger = input.trigger;
    if (input.currentStep !== undefined) patch.current_step = input.currentStep;
    if (input.partnerPrecision !== undefined) patch.partner_precision = input.partnerPrecision;
    if (input.completedAt !== undefined) patch.completed_at = input.completedAt;

    const { data, error } = await this.client
      .from("flow_attempts")
      .update(patch)
      .eq("id", input.flowAttemptId)
      .select()
      .single<FlowAttemptRow>();

    if (error) {
      throw new Error(`No se pudo actualizar flow_attempts: ${error.message}`);
    }
    return toFlowAttemptRecord(data);
  }

  // upsert con onConflict: flow_attempt_id es unique en problem_context,
  // asi que un reintento normal (doble submit, refresh tras enviar)
  // actualiza la misma fila en vez de duplicarla.
  async upsertProblemContext(input: UpsertProblemContextInput): Promise<ProblemContextRecord> {
    const { data, error } = await this.client
      .from("problem_context")
      .upsert(
        {
          flow_attempt_id: input.flowAttemptId,
          trigger: input.trigger,
          free_text: input.freeText,
          text_provided: input.textProvided,
        },
        { onConflict: "flow_attempt_id" }
      )
      .select()
      .single<ProblemContextRow>();

    if (error) {
      throw new Error(`No se pudo guardar problem_context: ${error.message}`);
    }
    return toProblemContextRecord(data);
  }

  async getProblemContextByFlowAttempt(flowAttemptId: string): Promise<ProblemContextRecord | null> {
    const { data, error } = await this.client
      .from("problem_context")
      .select()
      .eq("flow_attempt_id", flowAttemptId)
      .maybeSingle<ProblemContextRow>();

    if (error) {
      throw new Error(`No se pudo consultar problem_context: ${error.message}`);
    }
    return data ? toProblemContextRecord(data) : null;
  }

  async deleteProblemContext(flowAttemptId: string): Promise<void> {
    const { error } = await this.client.from("problem_context").delete().eq("flow_attempt_id", flowAttemptId);
    if (error) {
      throw new Error(`No se pudo borrar problem_context: ${error.message}`);
    }
  }

  // RPC atomica (supabase/migrations/20260110000000_free_text_consent.sql):
  // bloquea flow_attempts, decide por el ultimo evento de consentimiento
  // por secuencia y escribe problem_context + el evento en una sola
  // transaccion. outcome="version_conflict" significa que no se escribio
  // nada -- hay un consentimiento vigente de una version distinta.
  async submitProblemContextWithFreeText(
    input: SubmitProblemContextWithFreeTextInput
  ): Promise<SubmitProblemContextWithFreeTextResult> {
    const { data, error } = await this.client.rpc("submit_problem_context_with_free_text", {
      p_flow_attempt_id: input.flowAttemptId,
      p_trigger: input.trigger,
      p_free_text: input.freeText,
      p_consent_version: input.consentVersion,
    });

    if (error) {
      throw new Error(`No se pudo guardar el consentimiento del free_text: ${error.message}`);
    }

    const row = (Array.isArray(data) ? data[0] : data) as { outcome: SubmitProblemContextWithFreeTextResult["outcome"] };
    return { outcome: row.outcome };
  }

  // RPC atomica: decide por el ultimo evento, y solo si es 'granted'
  // borra las previews dependientes, limpia free_text/text_provided e
  // inserta el 'withdrawn' -- todo o nada. Idempotente para los demas
  // casos (no_consent/already_withdrawn/already_expired).
  async withdrawFreeTextConsent(flowAttemptId: string): Promise<WithdrawFreeTextConsentResult> {
    const { data, error } = await this.client.rpc("withdraw_free_text_consent", {
      p_flow_attempt_id: flowAttemptId,
    });

    if (error) {
      throw new Error(`No se pudo retirar el consentimiento del free_text: ${error.message}`);
    }

    const row = (Array.isArray(data) ? data[0] : data) as {
      outcome: WithdrawFreeTextConsentResult["outcome"];
      previews_deleted: number;
    };
    return { outcome: row.outcome, previewsDeleted: row.previews_deleted };
  }

  // Canal de ejercicio de derechos: borrado explicito del historial de
  // eventos (deleteAllOwnData no puede depender de on delete cascade
  // hacia flow_attempts, que se conserva como cascara). Nunca toca
  // free_text_consent_versions.
  async deleteFreeTextConsentEvents(flowAttemptId: string): Promise<void> {
    const { error } = await this.client
      .from("free_text_consent_events")
      .delete()
      .eq("flow_attempt_id", flowAttemptId);
    if (error) {
      throw new Error(`No se pudo borrar free_text_consent_events: ${error.message}`);
    }
  }

  // upsert con onConflict: user_id es unique en user_birth_profile, asi
  // que reenviar el perfil propio (reintento normal) actualiza la misma
  // fila en vez de duplicarla.
  async upsertOwnBirthProfile(input: UpsertOwnBirthProfileInput): Promise<UserBirthProfileRecord> {
    const { data, error } = await this.client
      .from("user_birth_profile")
      .upsert(
        {
          user_id: input.userId,
          birth_date: input.birthDate,
          birth_time: input.birthTime,
          birth_time_known: input.birthTimeKnown,
          place_label: input.place.placeLabel,
          country_code: input.place.countryCode,
          latitude: input.place.latitude,
          longitude: input.place.longitude,
          timezone_id: input.place.timezoneId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single<UserBirthProfileRow>();

    if (error) {
      throw new Error(`No se pudo guardar user_birth_profile: ${error.message}`);
    }
    return toUserBirthProfileRecord(data);
  }

  async getOwnBirthProfileByUser(userId: string): Promise<UserBirthProfileRecord | null> {
    const { data, error } = await this.client
      .from("user_birth_profile")
      .select()
      .eq("user_id", userId)
      .maybeSingle<UserBirthProfileRow>();

    if (error) {
      throw new Error(`No se pudo consultar user_birth_profile: ${error.message}`);
    }
    return data ? toUserBirthProfileRecord(data) : null;
  }

  async deleteOwnBirthProfile(userId: string): Promise<void> {
    const { error } = await this.client.from("user_birth_profile").delete().eq("user_id", userId);
    if (error) {
      throw new Error(`No se pudo borrar user_birth_profile: ${error.message}`);
    }
  }

  // upsert con onConflict: flow_attempt_id es unique en partner_input.
  async upsertPartnerInput(input: UpsertPartnerInputInput): Promise<PartnerInputRecord> {
    const { data, error } = await this.client
      .from("partner_input")
      .upsert(
        {
          flow_attempt_id: input.flowAttemptId,
          birth_date: input.birthDate,
          birth_time: input.birthTime,
          birth_time_known: input.birthTimeKnown,
          place_label: input.place?.placeLabel ?? null,
          country_code: input.place?.countryCode ?? null,
          latitude: input.place?.latitude ?? null,
          longitude: input.place?.longitude ?? null,
          timezone_id: input.place?.timezoneId ?? null,
        },
        { onConflict: "flow_attempt_id" }
      )
      .select()
      .single<PartnerInputRow>();

    if (error) {
      throw new Error(`No se pudo guardar partner_input: ${error.message}`);
    }
    return toPartnerInputRecord(data);
  }

  async getPartnerInputByFlowAttempt(flowAttemptId: string): Promise<PartnerInputRecord | null> {
    const { data, error } = await this.client
      .from("partner_input")
      .select()
      .eq("flow_attempt_id", flowAttemptId)
      .maybeSingle<PartnerInputRow>();

    if (error) {
      throw new Error(`No se pudo consultar partner_input: ${error.message}`);
    }
    return data ? toPartnerInputRecord(data) : null;
  }

  // Borrado explicito tras derivar y persistir partner_derived_profile
  // (VEGA_Plan_Tecnico, seccion 11): sin error si la fila ya no existe
  // (idempotente por diseno, igual que el resto de la capa de
  // persistencia).
  async deletePartnerInput(flowAttemptId: string): Promise<void> {
    const { error } = await this.client.from("partner_input").delete().eq("flow_attempt_id", flowAttemptId);
    if (error) {
      throw new Error(`No se pudo borrar partner_input: ${error.message}`);
    }
  }

  // upsert con onConflict: flow_attempt_id es unique en
  // partner_derived_profile.
  async upsertPartnerDerivedProfile(
    input: UpsertPartnerDerivedProfileInput
  ): Promise<PartnerDerivedProfileRecord> {
    const { data, error } = await this.client
      .from("partner_derived_profile")
      .upsert(
        {
          flow_attempt_id: input.flowAttemptId,
          partner_precision: input.partnerPrecision,
          synastry_status: input.derivedFeatures.status,
          derived_features: input.derivedFeatures,
        },
        { onConflict: "flow_attempt_id" }
      )
      .select()
      .single<PartnerDerivedProfileRow>();

    if (error) {
      throw new Error(`No se pudo guardar partner_derived_profile: ${error.message}`);
    }
    return toPartnerDerivedProfileRecord(data);
  }

  // delete_after > now(): una fila caducada se trata como inexistente,
  // nunca se reutiliza, con independencia de si el borrado fisico (cron)
  // ya ha pasado por ella o no (VEGA_Base_Juridica_Segmento_B_v1.md,
  // revision de seguridad 2026-10-07). Filtro aplicado en la propia
  // consulta, no en el cliente, para que "ok" e "insuficient_data" sigan
  // el mismo criterio sin logica adicional aqui.
  async getPartnerDerivedProfileByFlowAttempt(flowAttemptId: string): Promise<PartnerDerivedProfileRecord | null> {
    const { data, error } = await this.client
      .from("partner_derived_profile")
      .select()
      .eq("flow_attempt_id", flowAttemptId)
      .gt("delete_after", new Date().toISOString())
      .maybeSingle<PartnerDerivedProfileRow>();

    if (error) {
      throw new Error(`No se pudo consultar partner_derived_profile: ${error.message}`);
    }
    return data ? toPartnerDerivedProfileRecord(data) : null;
  }

  async deletePartnerDerivedProfile(flowAttemptId: string): Promise<void> {
    const { error } = await this.client
      .from("partner_derived_profile")
      .delete()
      .eq("flow_attempt_id", flowAttemptId);
    if (error) {
      throw new Error(`No se pudo borrar partner_derived_profile: ${error.message}`);
    }
  }

  // Cada intento de generacion (exito, invalido o error) crea una fila
  // nueva: no es un upsert. Ninguna columna es unique en flow_attempt_id
  // a proposito (una previa invalida no debe bloquear un reintento
  // posterior); la idempotencia "no regenerar si ya hay una valida" la
  // aplica preview-service.ts consultando getValidPreviewByFlowAttempt
  // antes de llamar a Vega/OpenAI.
  async createPreview(input: CreatePreviewInput): Promise<PreviewRecord> {
    const { data, error } = await this.client
      .from("previews")
      .insert({
        flow_attempt_id: input.flowAttemptId,
        schema_version: input.schemaVersion,
        prompt_version: input.promptVersion,
        model_id: input.modelId,
        partner_precision: input.partnerPrecision,
        chart_id: input.chartId,
        evidence_schema_version: input.evidenceSchemaVersion,
        facts_version: input.factsVersion,
        claims_version: input.claimsVersion,
        time_known: input.timeKnown,
        chart_id_b: input.chartIdB ?? null,
        synastry_facts_version: input.synastryFactsVersion ?? null,
        synastry_claims_version: input.synastryClaimsVersion ?? null,
        synastry_evidence_schema_version: input.synastryEvidenceSchemaVersion ?? null,
        time_known_b: input.timeKnownB ?? null,
        evidence_ids_used: input.evidenceIdsUsed,
        preview_json: input.preview,
        generation_status: input.generationStatus,
        error_type: input.errorType,
        latency_ms: input.latencyMs,
        used_free_text: input.usedFreeText,
      })
      .select()
      .single<PreviewRow>();

    if (error) {
      throw new Error(`No se pudo guardar previews: ${error.message}`);
    }
    return toPreviewRecord(data);
  }

  async getValidPreviewByFlowAttempt(flowAttemptId: string): Promise<PreviewRecord | null> {
    const { data, error } = await this.client
      .from("previews")
      .select()
      .eq("flow_attempt_id", flowAttemptId)
      .eq("generation_status", "valid")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<PreviewRow>();

    if (error) {
      throw new Error(`No se pudo consultar previews: ${error.message}`);
    }
    return data ? toPreviewRecord(data) : null;
  }

  async deletePreviewsForFlowAttempt(flowAttemptId: string): Promise<void> {
    const { error } = await this.client.from("previews").delete().eq("flow_attempt_id", flowAttemptId);
    if (error) {
      throw new Error(`No se pudo borrar previews: ${error.message}`);
    }
  }

  async createPricedAccessIntentIfNotExists(
    input: CreatePricedAccessIntentInput
  ): Promise<CreateIfNotExistsResult<PricedAccessIntentRecord>> {
    const { data, error } = await this.client
      .from("priced_access_intents")
      .insert({
        flow_attempt_id: input.flowAttemptId,
        price_minor: input.priceMinor,
        currency: input.currency,
      })
      .select()
      .single<PricedAccessIntentRow>();

    if (error) {
      if (error.code === POSTGRES_UNIQUE_VIOLATION) {
        const existing = await this.getPricedAccessIntentByFlowAttempt(input.flowAttemptId);
        if (existing) return { record: existing, wasNew: false };
      }
      throw new Error(`No se pudo guardar priced_access_intents: ${error.message}`);
    }
    return { record: toPricedAccessIntentRecord(data), wasNew: true };
  }

  async getPricedAccessIntentByFlowAttempt(flowAttemptId: string): Promise<PricedAccessIntentRecord | null> {
    const { data, error } = await this.client
      .from("priced_access_intents")
      .select()
      .eq("flow_attempt_id", flowAttemptId)
      .maybeSingle<PricedAccessIntentRow>();

    if (error) {
      throw new Error(`No se pudo consultar priced_access_intents: ${error.message}`);
    }
    return data ? toPricedAccessIntentRecord(data) : null;
  }

  async createWaitlistEntryIfNotExists(
    input: CreateWaitlistEntryInput
  ): Promise<CreateIfNotExistsResult<WaitlistRecord>> {
    const { data, error } = await this.client
      .from("waitlist")
      .insert({
        flow_attempt_id: input.flowAttemptId,
        email: input.email,
        consent_version: input.consentVersion,
      })
      .select()
      .single<WaitlistRow>();

    if (error) {
      if (error.code === POSTGRES_UNIQUE_VIOLATION) {
        const existing = await this.getWaitlistEntryByFlowAttempt(input.flowAttemptId);
        if (existing) return { record: existing, wasNew: false };
      }
      throw new Error(`No se pudo guardar waitlist: ${error.message}`);
    }
    return { record: toWaitlistRecord(data), wasNew: true };
  }

  async getWaitlistEntryByFlowAttempt(flowAttemptId: string): Promise<WaitlistRecord | null> {
    const { data, error } = await this.client
      .from("waitlist")
      .select()
      .eq("flow_attempt_id", flowAttemptId)
      .maybeSingle<WaitlistRow>();

    if (error) {
      throw new Error(`No se pudo consultar waitlist: ${error.message}`);
    }
    return data ? toWaitlistRecord(data) : null;
  }

  async deleteWaitlistEntry(flowAttemptId: string): Promise<void> {
    const { error } = await this.client.from("waitlist").delete().eq("flow_attempt_id", flowAttemptId);
    if (error) {
      throw new Error(`No se pudo borrar waitlist: ${error.message}`);
    }
  }
}
