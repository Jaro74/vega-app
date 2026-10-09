import type { PartnerPrecision, Segment } from "@/types/experiment";
import type { PreviewGenerationErrorType, PreviewGenerationStatus, PreviewV1Output } from "@/types/preview";
import type {
  SynastryParticipant,
  VegaSynastryEvidenceItem,
  VegaSynastryPrecision,
  VegaSynastryTimeContext,
  VegaSynastryVersions,
} from "@/types/synastry";

// Contrato de persistencia experimental (Sprint 1). Dos implementaciones
// comparten este mismo contrato: SupabaseExperimentRepository (real,
// Postgres via supabase-js) e InMemoryExperimentRepository (solo para
// este sandbox de desarrollo mientras no hay proyecto Supabase
// conectado, ver libs/db/index.ts).

export interface AcquisitionData {
  trafficSource: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  placement: string | null;
  deviceType: string | null;
}

export interface ExperimentUserRecord {
  id: string;
  anonymousUserId: string;
  experimentId: string;
  firstSeenAt: string;
  lastSeenAt: string;
  acquisition: AcquisitionData;
  isTest: boolean;
}

export interface FlowAttemptRecord {
  id: string;
  userId: string;
  segment: Segment;
  trigger: string | null;
  currentStep: string | null;
  partnerPrecision: PartnerPrecision | null;
  isPrimaryAttempt: boolean;
  startedAt: string;
  completedAt: string | null;
}

// Sprint 2 - datos de nacimiento propios y de contexto/problema. Fuente:
// VEGA_Plan_Tecnico_Implementacion_Experimento.md, seccion 8.
export interface ProblemContextRecord {
  id: string;
  flowAttemptId: string;
  trigger: string;
  freeText: string | null;
  textProvided: boolean;
  createdAt: string;
}

// Consentimiento especifico del free_text (art. 6.1.a / 9.2.a cuando
// proceda) -- ver supabase/migrations/20260110000000_free_text_consent.sql.
// Las dos operaciones son atomicas en el driver real (RPC con lock
// sobre flow_attempts); el driver en memoria replica la misma maquina
// de estados de forma sincrona (sin lock real, innecesario en un
// proceso single-threaded entre awaits).
export interface SubmitProblemContextWithFreeTextInput {
  flowAttemptId: string;
  trigger: string;
  freeText: string;
  consentVersion: string;
}

export type SubmitProblemContextWithFreeTextOutcome = "ok" | "version_conflict";

export interface SubmitProblemContextWithFreeTextResult {
  outcome: SubmitProblemContextWithFreeTextOutcome;
}

export type WithdrawFreeTextConsentOutcome = "withdrawn" | "no_consent" | "already_withdrawn" | "already_expired";

export interface WithdrawFreeTextConsentResult {
  outcome: WithdrawFreeTextConsentOutcome;
  previewsDeleted: number;
}

export interface BirthPlaceInput {
  placeLabel: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezoneId: string;
}

export interface UserBirthProfileRecord {
  id: string;
  userId: string;
  birthDate: string;
  birthTime: string | null;
  birthTimeKnown: boolean;
  placeLabel: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezoneId: string;
  createdAt: string;
  updatedAt: string;
}

// Temporal por diseno (VEGA_Fase_4C seccion W): sin nombre, email ni
// ningun identificador de la segunda persona. birth_time/place son
// opcionales porque partial/minimal los omiten deliberadamente (nunca
// inventar un valor).
export interface PartnerInputRecord {
  id: string;
  flowAttemptId: string;
  birthDate: string;
  birthTime: string | null;
  birthTimeKnown: boolean | null;
  placeLabel: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  timezoneId: string | null;
  createdAt: string;
  expiresAt: string;
}

// Sprint 3B - cache de la evidencia de sinastria ya validada por Vega
// para un flow_attempt, usada para (a) idempotencia ("insufficient_data"
// no debe volver a llamar a Vega/OpenAI) y (b) reintentos tras un fallo
// de OpenAI sin repetir la llamada a Vega, una vez que partner_input ya
// se ha borrado (VEGA_Plan_Tecnico, seccion 11 "ELIMINACION AUTOMATICA
// PARTNER"). Discriminada por status: "insufficient_data" nunca contiene
// evidencia (Vega no dio ninguna, o dio menos de 2 validas).
export type PartnerDerivedFeatures =
  | {
      status: "ok";
      chartIdA: string;
      chartIdB: string;
      versions: VegaSynastryVersions;
      timeContext: VegaSynastryTimeContext;
      precision: VegaSynastryPrecision;
      allowedEvidence: VegaSynastryEvidenceItem[];
    }
  | {
      status: "insufficient_data";
      reason: "participant_minimal" | "insufficient_evidence";
      insufficientParticipants: SynastryParticipant[];
    };

export interface PartnerDerivedProfileRecord {
  id: string;
  flowAttemptId: string;
  partnerPrecision: PartnerPrecision;
  derivedFeatures: PartnerDerivedFeatures;
  createdAt: string;
  deleteAfter: string;
}

export interface UpsertPartnerDerivedProfileInput {
  flowAttemptId: string;
  partnerPrecision: PartnerPrecision;
  derivedFeatures: PartnerDerivedFeatures;
}

export interface FindOrCreateUserInput {
  anonymousUserId: string;
  experimentId: string;
  acquisition: AcquisitionData;
  isTest: boolean;
}

export interface CreateFlowAttemptInput {
  userId: string;
  segment: Segment;
}

export interface UpdateFlowAttemptProgressInput {
  flowAttemptId: string;
  trigger?: string;
  currentStep?: string;
  partnerPrecision?: PartnerPrecision;
  completedAt?: string;
}

// Idempotente por diseno: flowAttemptId es unique en problem_context, asi
// que reenviar el mismo intento (reintento normal, doble submit) nunca
// duplica la fila (VEGA Sprint 2, "escrituras idempotentes").
export interface UpsertProblemContextInput {
  flowAttemptId: string;
  trigger: string;
  freeText: string | null;
  textProvided: boolean;
}

// Idempotente por diseno: userId es unique en user_birth_profile.
export interface UpsertOwnBirthProfileInput {
  userId: string;
  birthDate: string;
  birthTime: string | null;
  birthTimeKnown: boolean;
  place: BirthPlaceInput;
}

// Idempotente por diseno: flowAttemptId es unique en partner_input.
export interface UpsertPartnerInputInput {
  flowAttemptId: string;
  birthDate: string;
  birthTime: string | null;
  birthTimeKnown: boolean | null;
  place: BirthPlaceInput | null;
}

// Lanzada cuando la unicidad de is_primary_attempt=true por usuario se
// viola (en Postgres: codigo 23505 sobre only_one_primary_attempt). El
// llamador debe recuperar el intento primario existente, nunca tratarlo
// como un fallo terminal.
export class UniqueConstraintViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UniqueConstraintViolationError";
  }
}

// Sprint 3A - una fila por intento de generacion de preview (exito,
// invalida o error), no solo por preview mostrada: da trazabilidad
// tecnica completa (VEGA_Plan_Tecnico seccion 8 "previews", extendida con
// las columnas que exige el contrato definitivo de Vega: chartId y las
// tres versiones de evidence, ausentes en el plan original porque ese
// contrato todavia no existia cuando se escribio).
// chartId/timeKnown (sin sufijo) son siempre de la persona A (el usuario,
// en ambos segmentos); chartIdB/timeKnownB solo existen en filas de
// segmento B. evidenceSchemaVersion/factsVersion/claimsVersion son
// natal-only (null en B); synastry*Version son B-only (null en A): cada
// fila de "previews" solo rellena el bloque de columnas que le corresponde
// a su propio contrato de Vega.
export interface PreviewRecord {
  id: string;
  flowAttemptId: string;
  schemaVersion: string;
  promptVersion: string;
  modelId: string | null;
  partnerPrecision: PartnerPrecision | null;
  chartId: string | null;
  evidenceSchemaVersion: string | null;
  factsVersion: string | null;
  claimsVersion: string | null;
  timeKnown: boolean | null;
  chartIdB: string | null;
  synastryFactsVersion: string | null;
  synastryClaimsVersion: string | null;
  synastryEvidenceSchemaVersion: string | null;
  timeKnownB: boolean | null;
  evidenceIdsUsed: string[];
  preview: PreviewV1Output | null;
  generationStatus: PreviewGenerationStatus;
  errorType: PreviewGenerationErrorType | null;
  latencyMs: number | null;
  // Fijado en el momento de generacion (true si problem_context.freeText
  // se envio efectivamente a OpenAI para esta fila); nunca se recalcula
  // despues. Necesario para la supresion selectiva al retirar el
  // consentimiento del free_text (withdrawFreeTextConsent borra solo las
  // filas de previews con used_free_text = true).
  usedFreeText: boolean;
  createdAt: string;
}

export interface CreatePreviewInput {
  flowAttemptId: string;
  schemaVersion: string;
  promptVersion: string;
  modelId: string | null;
  partnerPrecision: PartnerPrecision | null;
  chartId: string | null;
  evidenceSchemaVersion: string | null;
  factsVersion: string | null;
  claimsVersion: string | null;
  timeKnown: boolean | null;
  chartIdB?: string | null;
  synastryFactsVersion?: string | null;
  synastryClaimsVersion?: string | null;
  synastryEvidenceSchemaVersion?: string | null;
  timeKnownB?: boolean | null;
  evidenceIdsUsed: string[];
  preview: PreviewV1Output | null;
  generationStatus: PreviewGenerationStatus;
  errorType: PreviewGenerationErrorType | null;
  latencyMs: number | null;
  usedFreeText: boolean;
}

// Sprint 4 - registro de intencion de pago confirmada (fake door). Unico
// por flow_attempt_id: el repositorio expone su creacion como
// "if-not-exists" (ver createPricedAccessIntentIfNotExists) para que un
// segundo intento del mismo usuario devuelva la fila existente sin
// duplicar ni volver a disparar el evento de analytics correspondiente
// (VEGA_Fase_4C seccion O; encargo Sprint 4 seccion 4).
export interface PricedAccessIntentRecord {
  id: string;
  flowAttemptId: string;
  priceMinor: number;
  currency: string;
  createdAt: string;
}

export interface CreatePricedAccessIntentInput {
  flowAttemptId: string;
  priceMinor: number;
  currency: string;
}

// Sprint 4 - lista de espera. email es el unico dato personal: vive solo
// aqui (nunca en PostHog). consentVersion se valida contra
// WAITLIST_CONSENT_VERSION en el servicio, no aqui (el repositorio solo
// persiste lo que el servicio ya valido).
export interface WaitlistRecord {
  id: string;
  flowAttemptId: string;
  email: string;
  consentVersion: string;
  confirmationStatus: "pending" | "sent" | "failed";
  createdAt: string;
}

export interface CreateWaitlistEntryInput {
  flowAttemptId: string;
  email: string;
  consentVersion: string;
}

// Resultado comun de las operaciones "if-not-exists" de Sprint 4: wasNew
// es lo unico que decide si el llamador debe disparar el evento de
// analytics correspondiente (priced_access_intent / waitlist_submit) --
// un reintento que encuentra la fila ya creada nunca debe reemitir el
// evento (encargo Sprint 4 seccion 4, "Evita duplicados por refresh o
// doble clic").
export interface CreateIfNotExistsResult<T> {
  record: T;
  wasNew: boolean;
}

export interface ExperimentRepository {
  findOrCreateExperimentUser(input: FindOrCreateUserInput): Promise<ExperimentUserRecord>;
  getExperimentUserByAnonymousId(anonymousUserId: string): Promise<ExperimentUserRecord | null>;
  countFlowAttemptsForUser(userId: string): Promise<number>;
  getFlowAttemptById(id: string): Promise<FlowAttemptRecord | null>;
  getPrimaryFlowAttempt(userId: string): Promise<FlowAttemptRecord | null>;
  // Canal de ejercicio de derechos (libs/experiment/privacy-service.ts):
  // todos los intentos (primario + secundarios) de un usuario, para poder
  // recorrerlos al construir el resumen o al borrar el nucleo purgable.
  listFlowAttemptsForUser(userId: string): Promise<FlowAttemptRecord[]>;
  createFlowAttempt(input: CreateFlowAttemptInput): Promise<FlowAttemptRecord>;
  updateFlowAttemptProgress(input: UpdateFlowAttemptProgressInput): Promise<FlowAttemptRecord>;

  upsertProblemContext(input: UpsertProblemContextInput): Promise<ProblemContextRecord>;
  getProblemContextByFlowAttempt(flowAttemptId: string): Promise<ProblemContextRecord | null>;
  // Canal de ejercicio de derechos: borrado explicito a peticion del
  // usuario (fuera de la retencion automatica de 30 dias). Idempotente,
  // igual que deletePartnerInput/deletePartnerDerivedProfile.
  deleteProblemContext(flowAttemptId: string): Promise<void>;

  // Alta/actualizacion atomica de problem_context + consentimiento del
  // free_text (art. 6.1.a / 9.2.a cuando proceda). Reemplaza, solo para
  // el camino que contiene free_text, al upsertProblemContext de arriba
  // -- este sigue existiendo para el camino sin texto (solo trigger),
  // que no necesita ninguna garantia de atomicidad adicional. Maquina
  // de estados exacta en supabase/migrations/20260110000000_free_text_consent.sql.
  submitProblemContextWithFreeText(
    input: SubmitProblemContextWithFreeTextInput
  ): Promise<SubmitProblemContextWithFreeTextResult>;

  // Retirada atomica: borra las previews dependientes (used_free_text),
  // limpia free_text/text_provided e inserta el evento 'withdrawn' --
  // todo o nada. Idempotente (no_consent/already_withdrawn/already_expired
  // para los casos en que no hay nada que retirar).
  withdrawFreeTextConsent(flowAttemptId: string): Promise<WithdrawFreeTextConsentResult>;

  // Canal de ejercicio de derechos: borra UNICAMENTE el historial de
  // eventos de consentimiento del free_text de este flow_attempt.
  // Necesario porque flow_attempts se conserva como cascara tras
  // deleteAllOwnData (nunca se borra la fila), asi que el
  // "on delete cascade" de free_text_consent_events hacia flow_attempts
  // nunca se dispara por esa via -- este metodo es el borrado real.
  // Nunca toca free_text_consent_versions (catalogo legal/versionado de
  // Vega, sin datos personales del usuario). Idempotente.
  deleteFreeTextConsentEvents(flowAttemptId: string): Promise<void>;

  upsertOwnBirthProfile(input: UpsertOwnBirthProfileInput): Promise<UserBirthProfileRecord>;
  getOwnBirthProfileByUser(userId: string): Promise<UserBirthProfileRecord | null>;
  // Canal de ejercicio de derechos: por userId, no por flowAttemptId (el
  // perfil propio es compartido entre el intento primario y los
  // secundarios). Idempotente.
  deleteOwnBirthProfile(userId: string): Promise<void>;

  upsertPartnerInput(input: UpsertPartnerInputInput): Promise<PartnerInputRecord>;
  getPartnerInputByFlowAttempt(flowAttemptId: string): Promise<PartnerInputRecord | null>;
  // Borrado explicito tras derivar y persistir partner_derived_profile
  // correctamente (VEGA_Plan_Tecnico, seccion 11): los datos brutos de la
  // segunda persona no deben sobrevivir mas alla de lo necesario.
  deletePartnerInput(flowAttemptId: string): Promise<void>;

  upsertPartnerDerivedProfile(input: UpsertPartnerDerivedProfileInput): Promise<PartnerDerivedProfileRecord>;
  getPartnerDerivedProfileByFlowAttempt(flowAttemptId: string): Promise<PartnerDerivedProfileRecord | null>;
  // Invalida el cache de derivacion (ej. el usuario vuelve a "Datos de la
  // otra persona" y reenvia datos distintos tras un insufficient_data):
  // la proxima generacion debe volver a llamar a Vega, no reutilizar la
  // derivacion obsoleta.
  deletePartnerDerivedProfile(flowAttemptId: string): Promise<void>;

  createPreview(input: CreatePreviewInput): Promise<PreviewRecord>;
  getValidPreviewByFlowAttempt(flowAttemptId: string): Promise<PreviewRecord | null>;
  // Canal de ejercicio de derechos: borra TODAS las filas de este
  // flow_attempt (exito, invalida y error), no solo la valida -- createPreview
  // nunca es un upsert, puede haber varias. Idempotente.
  deletePreviewsForFlowAttempt(flowAttemptId: string): Promise<void>;

  createPricedAccessIntentIfNotExists(
    input: CreatePricedAccessIntentInput
  ): Promise<CreateIfNotExistsResult<PricedAccessIntentRecord>>;
  getPricedAccessIntentByFlowAttempt(flowAttemptId: string): Promise<PricedAccessIntentRecord | null>;

  createWaitlistEntryIfNotExists(
    input: CreateWaitlistEntryInput
  ): Promise<CreateIfNotExistsResult<WaitlistRecord>>;
  getWaitlistEntryByFlowAttempt(flowAttemptId: string): Promise<WaitlistRecord | null>;
  // Canal de ejercicio de derechos: supresion/retirada de la waitlist, a
  // peticion del usuario (delete-all o delete-waitlist). Idempotente.
  deleteWaitlistEntry(flowAttemptId: string): Promise<void>;
}
