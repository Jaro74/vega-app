import type { ExperimentRepository, FlowAttemptRecord } from "@/libs/db/types";
import { getPlaceById } from "@/libs/places/search";
import { derivePartnerPrecision, type PartnerRequestInput } from "@/libs/validation/partner";
import { isTriggerValidForSegment } from "@/libs/validation/problem";
import type { ProblemRequestInput } from "@/libs/validation/problem";
import type { OwnProfileRequestInput } from "@/libs/validation/profile";
import type { FlowStep, OwnProfilePrecision } from "@/types/experiment";

import { checkThirdPartySensitiveText } from "./third-party-sensitive-text-filter";

// Logica de negocio de Sprint 2 (router+onboarding), sin dependencia de
// Next.js: las rutas (app/api/problem, app/api/own-profile,
// app/api/partner) solo traducen HTTP <-> estas funciones. Mismo patron
// que libs/experiment/session-service.ts (Sprint 1).

export interface ServiceError {
  ok: false;
  // 409: consentimiento vigente de una version distinta de la enviada
  // (version_conflict de submitProblemContextWithFreeText) -- no se
  // decide aqui como resolverlo, solo se informa al cliente.
  status: 400 | 404 | 409;
  error: string;
}

function notFound(error: string): ServiceError {
  return { ok: false, status: 404, error };
}

function badRequest(error: string): ServiceError {
  return { ok: false, status: 400, error };
}

async function requireFlowAttempt(
  repository: ExperimentRepository,
  flowAttemptId: string
): Promise<FlowAttemptRecord | ServiceError> {
  const attempt = await repository.getFlowAttemptById(flowAttemptId);
  if (!attempt) return notFound("flow_attempt no encontrado");
  return attempt;
}

function isServiceError(value: unknown): value is ServiceError {
  return typeof value === "object" && value !== null && (value as ServiceError).ok === false;
}

export interface SubmitProblemResult {
  ok: true;
  nextStep: FlowStep;
}

// Un unico endpoint persiste trigger + texto opcional a la vez
// (types/api.ts ProblemRequest, contrato de Sprint 0, extendido de
// forma aditiva en la consulta de consentimiento del free_text): las
// pantallas A1/A2 (o B1/B2) son solo navegacion de UI, el submit real
// ocurre al terminar la pantalla de texto. Idempotente: reenviar el
// mismo flow_attempt_id actualiza la misma fila (unique en
// problem_context), nunca duplica.
//
// Camino sin texto (freeText vacio/ausente): upsertProblemContext
// simple, sin consentimiento -- sin cambios respecto al contrato
// original. Camino con texto: exige freeTextConsentGiven +
// freeTextConsentVersion, aplica el filtro compartido de categorias
// especiales de terceros ANTES de persistir, y delega la escritura
// atomica (problem_context + evento de consentimiento) en
// submitProblemContextWithFreeText (ver
// supabase/migrations/20260110000000_free_text_consent.sql). Nunca
// llama a ambos caminos para el mismo submit.
export async function submitProblem(
  repository: ExperimentRepository,
  input: ProblemRequestInput
): Promise<SubmitProblemResult | ServiceError> {
  const attempt = await requireFlowAttempt(repository, input.flowAttemptId);
  if (isServiceError(attempt)) return attempt;

  if (!isTriggerValidForSegment(attempt.segment, input.trigger)) {
    return badRequest(`trigger '${input.trigger}' no valido para el segmento ${attempt.segment}`);
  }

  const trimmedFreeText = input.freeText?.trim() ?? "";

  if (trimmedFreeText.length === 0) {
    await repository.upsertProblemContext({
      flowAttemptId: attempt.id,
      trigger: input.trigger,
      freeText: null,
      textProvided: false,
    });
  } else {
    if (!input.freeTextConsentGiven || !input.freeTextConsentVersion) {
      return badRequest("se requiere consentimiento explicito para tratar el texto libre");
    }

    const filterResult = checkThirdPartySensitiveText(trimmedFreeText);
    if (filterResult.blocked) {
      return badRequest(
        "el texto parece incluir datos de otra persona; edita el texto para hablar solo de tu propia situacion"
      );
    }

    const result = await repository.submitProblemContextWithFreeText({
      flowAttemptId: attempt.id,
      trigger: input.trigger,
      freeText: trimmedFreeText,
      consentVersion: input.freeTextConsentVersion,
    });

    if (result.outcome === "version_conflict") {
      return { ok: false, status: 409, error: "version_conflict" };
    }
  }

  await repository.updateFlowAttemptProgress({
    flowAttemptId: attempt.id,
    trigger: input.trigger,
    currentStep: "problem_text",
  });

  return { ok: true, nextStep: "own_profile_intro" };
}

export interface SubmitOwnProfileResult {
  ok: true;
  precision: OwnProfilePrecision;
  nextStep: "partner" | "preview";
}

// Igual que arriba: fecha + hora(-o-desconocida) + lugar se envian y
// persisten juntos en una unica llamada (contrato Sprint 0). Idempotente
// por unique(user_id) en user_birth_profile.
export async function submitOwnProfile(
  repository: ExperimentRepository,
  input: OwnProfileRequestInput
): Promise<SubmitOwnProfileResult | ServiceError> {
  const attempt = await requireFlowAttempt(repository, input.flowAttemptId);
  if (isServiceError(attempt)) return attempt;

  const place = getPlaceById(input.placeId);
  if (!place) return badRequest(`placeId ${input.placeId} no encontrado`);

  await repository.upsertOwnBirthProfile({
    userId: attempt.userId,
    birthDate: input.birthDate,
    birthTime: input.birthTimeKnown ? input.birthTime ?? null : null,
    birthTimeKnown: input.birthTimeKnown,
    place: {
      placeLabel: place.name,
      countryCode: place.countryCode,
      latitude: place.latitude,
      longitude: place.longitude,
      timezoneId: place.timezoneId,
    },
  });

  const isSegmentA = attempt.segment === "A";
  await repository.updateFlowAttemptProgress({
    flowAttemptId: attempt.id,
    currentStep: "birth_place",
    ...(isSegmentA ? { completedAt: new Date().toISOString() } : {}),
  });

  return {
    ok: true,
    precision: input.birthTimeKnown ? "full" : "limited",
    nextStep: isSegmentA ? "preview" : "partner",
  };
}

export interface SubmitPartnerResult {
  ok: true;
  partnerPrecision: "full" | "partial" | "minimal";
  analysisPossible: boolean;
}

// Redondeo deliberado a 2 decimales (~1,1 km) exclusivamente para la
// segunda persona del Segmento B (VEGA_Base_Juridica_Segmento_B_v1.md,
// bloque 5.B, prueba tecnica 2026-10-08): validado en full y partial, en
// 3 ciudades de latitud muy distinta, sin cambios estructurales en la
// evidencia de Vega. No se usa en submitOwnProfile (perfil propio), que
// sigue con la precision del dataset sin cambios.
function roundPartnerCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

// Solo aplica a B (VEGA_Fase_4C, seccion D-F). El nivel de precision lo
// decide siempre el servidor via derivePartnerPrecision, nunca el
// navegador. Idempotente por unique(flow_attempt_id) en partner_input.
export async function submitPartner(
  repository: ExperimentRepository,
  input: PartnerRequestInput
): Promise<SubmitPartnerResult | ServiceError> {
  const attempt = await requireFlowAttempt(repository, input.flowAttemptId);
  if (isServiceError(attempt)) return attempt;

  if (attempt.segment !== "B") {
    return badRequest("los datos de segunda persona solo aplican al segmento B");
  }

  const precision = derivePartnerPrecision(input);
  if (precision === "not_viable") {
    return badRequest("datos insuficientes para la segunda persona");
  }

  const place = input.placeId ? getPlaceById(input.placeId) : null;
  if (input.placeId && !place) {
    return badRequest(`placeId ${input.placeId} no encontrado`);
  }

  await repository.upsertPartnerInput({
    flowAttemptId: attempt.id,
    birthDate: input.birthDate,
    birthTime: input.birthTimeKnown ? input.birthTime ?? null : null,
    birthTimeKnown: input.birthTimeKnown ?? null,
    place: place
      ? {
          placeLabel: place.name,
          countryCode: place.countryCode,
          latitude: roundPartnerCoordinate(place.latitude),
          longitude: roundPartnerCoordinate(place.longitude),
          timezoneId: place.timezoneId,
        }
      : null,
  });

  // Invalida cualquier derivacion de sinastria cacheada (Sprint 3B): si
  // el usuario vuelve a "Datos de la otra persona" tras un
  // insufficient_data y envia datos distintos (ej. añade el lugar que
  // faltaba), la proxima generacion debe volver a llamar a Vega, no
  // reutilizar el resultado obsoleto. No falla el submit si no habia
  // ninguna derivacion previa que borrar.
  await repository.deletePartnerDerivedProfile(attempt.id);

  await repository.updateFlowAttemptProgress({
    flowAttemptId: attempt.id,
    partnerPrecision: precision,
    currentStep: "partner_data",
    completedAt: new Date().toISOString(),
  });

  return { ok: true, partnerPrecision: precision, analysisPossible: true };
}

export interface ResumeState {
  lastCompletedStep: FlowStep | null;
  birthDateCompleted: boolean;
  birthTimeKnown: boolean | null;
  // Sprint 4: permite que WaitlistStep, tras un refresh con
  // currentStep="waitlist" ya persistido, muestre directamente la pantalla
  // final "beta" en vez de volver a pedir el email.
  waitlistSubmitted: boolean;
}

// Usado por GET /api/session para reconstruir el estado tras un refresh
// (VEGA_Plan_Tecnico, seccion 6). Nunca devuelve datos personales: solo
// flags derivados de si existen filas, y el ultimo paso confirmado.
export async function getResumeState(
  repository: ExperimentRepository,
  userId: string,
  attempt: FlowAttemptRecord | null
): Promise<ResumeState> {
  if (!attempt) {
    return { lastCompletedStep: null, birthDateCompleted: false, birthTimeKnown: null, waitlistSubmitted: false };
  }

  const profile = await repository.getOwnBirthProfileByUser(userId);
  const waitlistEntry = await repository.getWaitlistEntryByFlowAttempt(attempt.id);

  return {
    lastCompletedStep: (attempt.currentStep as FlowStep | null) ?? null,
    birthDateCompleted: Boolean(profile),
    birthTimeKnown: profile?.birthTimeKnown ?? null,
    waitlistSubmitted: waitlistEntry !== null,
  };
}
