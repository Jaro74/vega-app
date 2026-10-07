// Contratos internos de las rutas /api/* del experimento (BFF).
// Fuente: VEGA_Plan_Tecnico_Implementacion_Experimento.md, secciones 6, 19-20, 45-47.
//
// Estos tipos describen el contrato; la implementacion de las rutas
// (Supabase, Vega, OpenAI) corresponde a sprints posteriores.

import type {
  FlowStep,
  OwnProfilePrecision,
  PartnerPrecision,
  Segment,
  Trigger,
} from "./experiment";
import type { PreviewGenerationErrorType, PreviewV1Output } from "./preview";
import type { SynastryParticipant } from "./synastry";

// GET /api/session
//
// Ampliado en Sprint 1 respecto al contrato de Sprint 0: se añaden
// anonymousUserId/flowAttemptId/isPrimaryAttempt/acquisition porque el
// frontend los necesita para recuperar el intento activo tras un
// refresh y para propiedades de analytics, sin tener que parsear
// cookies. Cambio aditivo, no rompe nada que ya se usara.
export interface SessionAcquisition {
  trafficSource: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  placement: string | null;
}

export interface SessionResponse {
  anonymousUserId: string;
  isTest: boolean;
  segment: Segment | null;
  flowAttemptId: string | null;
  isPrimaryAttempt: boolean | null;
  lastCompletedStep: FlowStep | null;
  birthDateCompleted: boolean;
  birthTimeKnown: boolean | null;
  // Sprint 3B: necesario para PreviewStep (segmento B) al reconstruir el
  // estado tras un refresh, sin volver a pasar por PartnerStep.
  partnerPrecision: PartnerPrecision | null;
  // Sprint 4: permite que WaitlistStep, tras un refresh con
  // currentStep="waitlist" ya persistido, muestre directamente la pantalla
  // final "beta" en vez de volver a pedir el email.
  waitlistSubmitted: boolean;
  acquisition: SessionAcquisition;
}

// POST /api/segment
//
// Cambio respecto a Sprint 0: ya no recibe flowAttemptId, porque ese id
// se CREA en este endpoint (no existe todavia cuando el usuario elige
// segmento por primera vez). Motivo tecnico: VEGA_Plan_Tecnico seccion
// 6 ("Al elegir: crear flow_attempt_id").
export interface SegmentRequest {
  segment: Segment;
}

export interface SegmentResponse {
  ok: true;
  flowAttemptId: string;
  isPrimaryAttempt: boolean;
}

// POST /api/problem
export interface ProblemRequest {
  flowAttemptId: string;
  trigger: Trigger;
  freeText?: string;
}

export interface ProblemResponse {
  ok: true;
  nextStep: FlowStep;
}

// POST /api/own-profile
export interface OwnProfileRequest {
  flowAttemptId: string;
  birthDate: string;
  birthTimeKnown: boolean;
  birthTime?: string;
  placeId: number;
}

export interface OwnProfileResponse {
  ok: true;
  precision: OwnProfilePrecision;
  nextStep: "partner" | "preview";
}

// POST /api/partner
export interface PartnerRequest {
  flowAttemptId: string;
  birthDate: string;
  birthTimeKnown?: boolean;
  birthTime?: string;
  placeId?: number;
}

export interface PartnerResponse {
  ok: true;
  partnerPrecision: PartnerPrecision;
  // Viabilidad LOCAL (derivePartnerPrecision no devolvio "not_viable"),
  // no si Vega podra construir una sinastria fiable: eso solo se sabe
  // tras llamar a /evidence/synastry (Sprint 3B). El evento analytics
  // partner_analysis_possible ya no se dispara a partir de este campo
  // (ver PreviewStep), precisamente por esa diferencia.
  analysisPossible: boolean;
}

// GET /api/places?q=
export interface PlaceSearchResult {
  placeId: number;
  name: string;
  admin1: string | null;
  countryCode: string;
  latitude: number;
  longitude: number;
}

// POST /api/preview (Sprint 3A, solo segmento A)
export interface PreviewGenerateRequest {
  flowAttemptId: string;
}

export interface PreviewGenerateValidResponse {
  ok: true;
  status: "valid";
  previewId: string;
  preview: PreviewV1Output;
}

export interface PreviewGenerateErrorResponse {
  ok: false;
  status: "error";
  errorType: PreviewGenerationErrorType;
}

// Segmento B (Sprint 3B): resultado de dominio cuando Vega no puede
// construir una sinastria fiable (participante "minimal", o menos de 2
// evidencias robustas). HTTP 200, no un error: nunca se improvisa un
// preview B a partir del natal individual.
export interface PreviewGenerateInsufficientDataResponse {
  ok: true;
  status: "insufficient_data";
  reason: "participant_minimal" | "insufficient_evidence";
  insufficientParticipants: SynastryParticipant[];
}

export type PreviewGenerateResponse =
  | PreviewGenerateValidResponse
  | PreviewGenerateErrorResponse
  | PreviewGenerateInsufficientDataResponse;

// POST /api/preview/complete (Sprint 4)
//
// Checkpoint puro de recuperacion tras refresh: no persiste ningun dato de
// negocio propio (el contenido de la preview ya esta en la tabla
// "previews"), solo confirma currentStep="preview" cuando el usuario pulsa
// "Continuar explorando" sobre una preview valida. Ver
// libs/experiment/flow-progress.ts.
export interface PreviewCompleteRequest {
  flowAttemptId: string;
}

export interface PreviewCompleteResponse {
  ok: true;
}

// POST /api/priced-intent
export interface PricedIntentRequest {
  flowAttemptId: string;
}

export interface PricedIntentResponse {
  ok: true;
  // Sprint 4: el cliente solo dispara el evento priced_access_intent
  // cuando wasNew es true (INSERT realmente nuevo en priced_access_intents).
  // Un reintento/doble clic que encuentra la fila ya creada devuelve
  // wasNew=false y el cliente NO reemite el evento.
  wasNew: boolean;
}

// POST /api/waitlist
//
// flowAttemptId anadido en Sprint 4 (el contrato original de Sprint 0 no lo
// llevaba): por consistencia con el resto de rutas de escritura del
// experimento (problem/own-profile/partner/preview), todas reciben
// flowAttemptId en el body. Ademas, /api/waitlist exige que ya exista una
// fila en priced_access_intents para ese flowAttemptId (ver
// libs/experiment/waitlist-service.ts) -- sin flowAttemptId no habria forma
// de comprobarlo server-side.
export interface WaitlistRequest {
  flowAttemptId: string;
  email: string;
  consentVersion: string;
}

export interface WaitlistResponse {
  ok: true;
  // Sprint 4: mismo patron que PricedIntentResponse.wasNew -- el cliente
  // solo dispara waitlist_submit cuando el INSERT fue realmente nuevo.
  wasNew: boolean;
}

// GET /api/privacy/summary
//
// "Resumen de datos asociados a la sesion actual" -- deliberadamente NO
// se presenta como el cumplimiento definitivo del derecho de acceso del
// RGPD; su suficiencia juridica como mecanismo de ejercicio de ese
// derecho queda pendiente de asesoria externa. Requiere una vega_session
// valida (resolveTrustedAnonymousUserId); sin ella, 401. Nunca incluye
// texto libre, fecha/hora/lugar de nacimiento en bruto ni evidencia
// astrologica -- solo existencia por categoria y metadatos tecnicos,
// salvo el email de waitlist (el propio dato de contacto del usuario,
// devuelto completo porque es un derecho de acceso sobre su propia
// sesion ya verificada).
export interface PrivacyWaitlistSummary {
  email: string;
  createdAt: string;
  consentVersion: string;
}

export interface PrivacyFlowAttemptSummary {
  flowAttemptId: string;
  segment: Segment;
  isPrimaryAttempt: boolean;
  startedAt: string;
  completedAt: string | null;
  hasProblemContext: boolean;
  hasPartnerInputPending: boolean;
  hasPartnerDerivedProfile: boolean;
  hasValidPreview: boolean;
  hasPricedAccessIntent: boolean;
  waitlistEntry: PrivacyWaitlistSummary | null;
}

export interface PrivacySummaryResponse {
  anonymousUserId: string;
  firstSeenAt: string;
  hasOwnBirthProfile: boolean;
  flowAttempts: PrivacyFlowAttemptSummary[];
}

// POST /api/privacy/delete-all
//
// Borra, en una sola solicitud autenticada, el nucleo purgable de TODOS
// los flow_attempts del usuario (problem_context, partner_input,
// partner_derived_profile, previews) mas la entrada de waitlist si
// existe en cualquiera de ellos, y solo entonces invalida vega_session/
// vega_auid/vega_attempt (vega_test no se toca). Comprehensiva a
// proposito: evita que el orden de pulsar botones separados pueda dejar
// la waitlist inalcanzable despues de invalidar la sesion. No toca
// experiment_users, flow_attempts (ni current_step/trigger/
// partner_precision/completed_at) ni priced_access_intents.
export interface PrivacyDeleteAllResponse {
  ok: true;
  flowAttemptsAffected: number;
  waitlistEntryDeleted: boolean;
}

// POST /api/privacy/delete-waitlist
//
// Accion independiente de delete-all: borra UNICAMENTE la entrada de
// waitlist del usuario. No invalida ninguna cookie ni afecta al resto
// del flujo -- para quien quiera salir de la lista de espera sin perder
// su sesion. Idempotente: deleted=false si no habia ninguna entrada no
// es un error.
export interface PrivacyDeleteWaitlistResponse {
  ok: true;
  deleted: boolean;
}

// Forma comun de error para cualquier ruta interna.
export interface ApiErrorResponse {
  ok: false;
  error: string;
}
