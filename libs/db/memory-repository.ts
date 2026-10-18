import type {
  CreateFlowAttemptInput,
  CreateIfNotExistsResult,
  CreatePreviewInput,
  CreatePricedAccessIntentInput,
  CreateWaitlistEntryInput,
  DeleteAllOwnDataResult,
  ExperimentRepository,
  ExperimentUserRecord,
  FindOrCreateUserInput,
  FlowAttemptRecord,
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

// Replica en memoria de una fila de free_text_consent_cycles (ver
// supabase/migrations/20260112000000_free_text_consent_cycles.sql).
// closeReason null <=> ciclo abierto (closedSeq is null en el driver
// real) -- aqui no hace falta modelar los seq de los eventos
// individuales, porque ninguna ruta de la aplicacion los lee jamas.
interface FreeTextConsentCycle {
  closeReason: "withdrawn" | "expired" | "erasure_requested" | null;
  consentVersion: string;
  lifecycleState: "active" | "blocked";
}

// Implementacion de desarrollo/test, solo mientras este sandbox no tiene
// un proyecto Supabase real conectado (ver libs/db/index.ts). Cumple
// exactamente el mismo contrato e invariantes que
// SupabaseExperimentRepository (unicidad de anonymous_user_id, un unico
// intento primario por usuario) para que la logica de negocio que se
// prueba aqui sea la misma que correria contra Postgres.
export class InMemoryExperimentRepository implements ExperimentRepository {
  private readonly usersByAnonymousId = new Map<string, ExperimentUserRecord>();
  private readonly usersById = new Map<string, ExperimentUserRecord>();
  private readonly attemptsById = new Map<string, FlowAttemptRecord>();
  private readonly attemptIdsByUser = new Map<string, string[]>();
  private readonly primaryAttemptIdByUser = new Map<string, string>();
  private readonly problemContextByFlowAttempt = new Map<string, ProblemContextRecord>();
  private readonly birthProfileByUser = new Map<string, UserBirthProfileRecord>();
  private readonly partnerInputByFlowAttempt = new Map<string, PartnerInputRecord>();
  private readonly partnerDerivedProfileByFlowAttempt = new Map<string, PartnerDerivedProfileRecord>();
  private readonly previewsByFlowAttempt = new Map<string, PreviewRecord[]>();
  private readonly pricedAccessIntentByFlowAttempt = new Map<string, PricedAccessIntentRecord>();
  private readonly waitlistEntryByFlowAttempt = new Map<string, WaitlistRecord>();
  // Replica en memoria, sin lock real (innecesario en un proceso
  // single-threaded entre awaits), del modelo de ciclos de
  // supabase/migrations/20260112000000_free_text_consent_cycles.sql:
  // una entrada por ciclo granted -> terminal (nunca por evento
  // individual, que es lo unico que el driver real persiste de forma
  // append-only y que ninguna ruta de la aplicacion necesita leer).
  private readonly freeTextConsentCyclesByFlowAttempt = new Map<string, FreeTextConsentCycle[]>();

  async findOrCreateExperimentUser(input: FindOrCreateUserInput): Promise<ExperimentUserRecord> {
    const existing = this.usersByAnonymousId.get(input.anonymousUserId);
    if (existing) {
      const updated: ExperimentUserRecord = { ...existing, lastSeenAt: new Date().toISOString() };
      this.usersByAnonymousId.set(input.anonymousUserId, updated);
      this.usersById.set(updated.id, updated);
      return updated;
    }

    const now = new Date().toISOString();
    const record: ExperimentUserRecord = {
      id: crypto.randomUUID(),
      anonymousUserId: input.anonymousUserId,
      experimentId: input.experimentId,
      firstSeenAt: now,
      lastSeenAt: now,
      isTest: input.isTest,
      acquisition: input.acquisition,
    };
    this.usersByAnonymousId.set(input.anonymousUserId, record);
    this.usersById.set(record.id, record);
    return record;
  }

  async getExperimentUserByAnonymousId(anonymousUserId: string): Promise<ExperimentUserRecord | null> {
    return this.usersByAnonymousId.get(anonymousUserId) ?? null;
  }

  async countFlowAttemptsForUser(userId: string): Promise<number> {
    return this.attemptIdsByUser.get(userId)?.length ?? 0;
  }

  async getFlowAttemptById(id: string): Promise<FlowAttemptRecord | null> {
    return this.attemptsById.get(id) ?? null;
  }

  async getPrimaryFlowAttempt(userId: string): Promise<FlowAttemptRecord | null> {
    const primaryId = this.primaryAttemptIdByUser.get(userId);
    if (!primaryId) return null;
    return this.attemptsById.get(primaryId) ?? null;
  }

  async listFlowAttemptsForUser(userId: string): Promise<FlowAttemptRecord[]> {
    const ids = this.attemptIdsByUser.get(userId) ?? [];
    return ids.map((id) => this.attemptsById.get(id)).filter((record): record is FlowAttemptRecord => Boolean(record));
  }

  async createFlowAttempt(input: CreateFlowAttemptInput): Promise<FlowAttemptRecord> {
    const isPrimaryAttempt = !this.primaryAttemptIdByUser.has(input.userId);
    if (!isPrimaryAttempt && !this.usersById.has(input.userId)) {
      // Defensivo: nunca deberia ocurrir en uso normal (el llamador
      // siempre resuelve el usuario antes), pero deja explicito que un
      // userId desconocido no crea un intento fantasma.
      throw new Error(`Usuario experimental desconocido: ${input.userId}`);
    }

    if (isPrimaryAttempt && this.primaryAttemptIdByUser.has(input.userId)) {
      throw new UniqueConstraintViolationError("Ya existe un intento primario para este usuario.");
    }

    const record: FlowAttemptRecord = {
      id: crypto.randomUUID(),
      userId: input.userId,
      segment: input.segment,
      trigger: null,
      currentStep: null,
      partnerPrecision: null,
      isPrimaryAttempt,
      startedAt: new Date().toISOString(),
      completedAt: null,
    };

    this.attemptsById.set(record.id, record);
    const existingIds = this.attemptIdsByUser.get(input.userId) ?? [];
    this.attemptIdsByUser.set(input.userId, [...existingIds, record.id]);
    if (isPrimaryAttempt) {
      this.primaryAttemptIdByUser.set(input.userId, record.id);
    }

    return record;
  }

  async updateFlowAttemptProgress(input: UpdateFlowAttemptProgressInput): Promise<FlowAttemptRecord> {
    const existing = this.attemptsById.get(input.flowAttemptId);
    if (!existing) {
      throw new Error(`flow_attempt desconocido: ${input.flowAttemptId}`);
    }

    const updated: FlowAttemptRecord = {
      ...existing,
      trigger: input.trigger ?? existing.trigger,
      currentStep: input.currentStep ?? existing.currentStep,
      partnerPrecision: input.partnerPrecision ?? existing.partnerPrecision,
      completedAt: input.completedAt ?? existing.completedAt,
    };
    this.attemptsById.set(updated.id, updated);
    return updated;
  }

  async upsertProblemContext(input: UpsertProblemContextInput): Promise<ProblemContextRecord> {
    const existing = this.problemContextByFlowAttempt.get(input.flowAttemptId);
    const record: ProblemContextRecord = {
      id: existing?.id ?? crypto.randomUUID(),
      flowAttemptId: input.flowAttemptId,
      trigger: input.trigger,
      freeText: input.freeText,
      textProvided: input.textProvided,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    this.problemContextByFlowAttempt.set(input.flowAttemptId, record);
    return record;
  }

  async getProblemContextByFlowAttempt(flowAttemptId: string): Promise<ProblemContextRecord | null> {
    return this.problemContextByFlowAttempt.get(flowAttemptId) ?? null;
  }

  async deleteProblemContext(flowAttemptId: string): Promise<void> {
    this.problemContextByFlowAttempt.delete(flowAttemptId);
  }

  // Ciclo activo (lifecycleState "active") mas reciente de un intento --
  // puede estar abierto (closeReason null) o cerrado sin haber pasado
  // todavia por performDeleteAllOwnData. Replica exactamente lo que
  // active_free_text_consent_cycles devuelve con
  // "order by opened_seq desc limit 1": al ser los ciclos siempre
  // estrictamente secuenciales por intento, el ultimo elemento activo
  // del array es siempre el mas reciente.
  private latestActiveCycle(flowAttemptId: string): FreeTextConsentCycle | null {
    const cycles = this.freeTextConsentCyclesByFlowAttempt.get(flowAttemptId) ?? [];
    for (let i = cycles.length - 1; i >= 0; i -= 1) {
      const cycle = cycles[i];
      if (cycle !== undefined && cycle.lifecycleState === "active") return cycle;
    }
    return null;
  }

  // Replica la maquina de estados de submit_problem_context_with_free_text():
  // sin ciclo abierto -> nuevo ciclo 'granted'; ciclo abierto con la
  // misma consent_version -> solo actualiza el texto, sin ciclo nuevo;
  // ciclo abierto con version distinta -> version_conflict, no escribe
  // nada.
  async submitProblemContextWithFreeText(
    input: SubmitProblemContextWithFreeTextInput
  ): Promise<SubmitProblemContextWithFreeTextResult> {
    if (!input.freeText || input.freeText.trim() === "") {
      throw new Error("submitProblemContextWithFreeText exige un free_text no vacio");
    }

    const cycles = this.freeTextConsentCyclesByFlowAttempt.get(input.flowAttemptId) ?? [];
    const open = this.latestActiveCycle(input.flowAttemptId);
    const openCycle = open && open.closeReason === null ? open : null;

    if (!openCycle) {
      cycles.push({ closeReason: null, consentVersion: input.consentVersion, lifecycleState: "active" });
      this.freeTextConsentCyclesByFlowAttempt.set(input.flowAttemptId, cycles);
    } else if (openCycle.consentVersion === input.consentVersion) {
      // Consentimiento vigente de la misma version: solo se actualiza el
      // texto, sin ciclo nuevo.
    } else {
      return { outcome: "version_conflict" };
    }

    const existing = this.problemContextByFlowAttempt.get(input.flowAttemptId);
    const record: ProblemContextRecord = {
      id: existing?.id ?? crypto.randomUUID(),
      flowAttemptId: input.flowAttemptId,
      trigger: input.trigger,
      freeText: input.freeText,
      textProvided: true,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    this.problemContextByFlowAttempt.set(input.flowAttemptId, record);
    return { outcome: "ok" };
  }

  // Replica withdraw_free_text_consent(): conserva el contrato de 4
  // outcomes consultando unicamente el ciclo activo mas reciente -- el
  // equivalente a leer active_free_text_consent_cycles, nunca a un
  // historial de eventos bloqueados (que tras performDeleteAllOwnData
  // deja de tener ningun ciclo "active" visible aqui).
  async withdrawFreeTextConsent(flowAttemptId: string): Promise<WithdrawFreeTextConsentResult> {
    const cycle = this.latestActiveCycle(flowAttemptId);

    if (!cycle) return { outcome: "no_consent", previewsDeleted: 0 };
    if (cycle.closeReason === "withdrawn") return { outcome: "already_withdrawn", previewsDeleted: 0 };
    if (cycle.closeReason === "expired") return { outcome: "already_expired", previewsDeleted: 0 };
    if (cycle.closeReason !== null) {
      // 'erasure_requested' es estructuralmente imposible aqui: ese
      // cierre bloquea el ciclo en el mismo paso (performDeleteAllOwnData),
      // por lo que nunca queda "active".
      throw new Error(`close_reason inesperado en ciclo activo no abierto: ${cycle.closeReason}`);
    }

    const previews = this.previewsByFlowAttempt.get(flowAttemptId) ?? [];
    const remaining = previews.filter((preview) => !preview.usedFreeText);
    const previewsDeleted = previews.length - remaining.length;
    this.previewsByFlowAttempt.set(flowAttemptId, remaining);

    const existingContext = this.problemContextByFlowAttempt.get(flowAttemptId);
    if (existingContext) {
      this.problemContextByFlowAttempt.set(flowAttemptId, { ...existingContext, freeText: null, textProvided: false });
    }

    cycle.closeReason = "withdrawn";

    return { outcome: "withdrawn", previewsDeleted };
  }

  // Solo para tests: replica el tramo relativo al free_text de
  // purge_expired_experiment_personal_data() (el cron real, nunca
  // invocado desde TypeScript) -- cierra el ciclo abierto vigente con
  // 'expired' y borra problem_context, exactamente como hace la funcion
  // SQL cuando problem_context.delete_after ya vencio. No forma parte de
  // ExperimentRepository: ninguna ruta de la aplicacion puede alcanzar
  // este metodo, solo el codigo de test que instancia esta clase
  // directamente.
  async simulatePurgeExpiredFreeTextConsentForTests(flowAttemptId: string): Promise<void> {
    const cycle = this.latestActiveCycle(flowAttemptId);
    const context = this.problemContextByFlowAttempt.get(flowAttemptId);

    if (cycle && cycle.closeReason === null && context?.textProvided) {
      cycle.closeReason = "expired";
    }

    this.problemContextByFlowAttempt.delete(flowAttemptId);
  }

  async upsertOwnBirthProfile(input: UpsertOwnBirthProfileInput): Promise<UserBirthProfileRecord> {
    const existing = this.birthProfileByUser.get(input.userId);
    const now = new Date().toISOString();
    const record: UserBirthProfileRecord = {
      id: existing?.id ?? crypto.randomUUID(),
      userId: input.userId,
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      birthTimeKnown: input.birthTimeKnown,
      placeLabel: input.place.placeLabel,
      countryCode: input.place.countryCode,
      latitude: input.place.latitude,
      longitude: input.place.longitude,
      timezoneId: input.place.timezoneId,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.birthProfileByUser.set(input.userId, record);
    return record;
  }

  async getOwnBirthProfileByUser(userId: string): Promise<UserBirthProfileRecord | null> {
    return this.birthProfileByUser.get(userId) ?? null;
  }

  async deleteOwnBirthProfile(userId: string): Promise<void> {
    this.birthProfileByUser.delete(userId);
  }

  async upsertPartnerInput(input: UpsertPartnerInputInput): Promise<PartnerInputRecord> {
    const existing = this.partnerInputByFlowAttempt.get(input.flowAttemptId);
    const now = new Date().toISOString();
    const record: PartnerInputRecord = {
      id: existing?.id ?? crypto.randomUUID(),
      flowAttemptId: input.flowAttemptId,
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      birthTimeKnown: input.birthTimeKnown,
      placeLabel: input.place?.placeLabel ?? null,
      countryCode: input.place?.countryCode ?? null,
      latitude: input.place?.latitude ?? null,
      longitude: input.place?.longitude ?? null,
      timezoneId: input.place?.timezoneId ?? null,
      createdAt: existing?.createdAt ?? now,
      expiresAt: existing?.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };
    this.partnerInputByFlowAttempt.set(input.flowAttemptId, record);
    return record;
  }

  async getPartnerInputByFlowAttempt(flowAttemptId: string): Promise<PartnerInputRecord | null> {
    return this.partnerInputByFlowAttempt.get(flowAttemptId) ?? null;
  }

  async deletePartnerInput(flowAttemptId: string): Promise<void> {
    this.partnerInputByFlowAttempt.delete(flowAttemptId);
  }

  async upsertPartnerDerivedProfile(
    input: UpsertPartnerDerivedProfileInput
  ): Promise<PartnerDerivedProfileRecord> {
    const existing = this.partnerDerivedProfileByFlowAttempt.get(input.flowAttemptId);
    const now = new Date().toISOString();
    const record: PartnerDerivedProfileRecord = {
      id: existing?.id ?? crypto.randomUUID(),
      flowAttemptId: input.flowAttemptId,
      partnerPrecision: input.partnerPrecision,
      derivedFeatures: input.derivedFeatures,
      createdAt: existing?.createdAt ?? now,
      deleteAfter: existing?.deleteAfter ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
    this.partnerDerivedProfileByFlowAttempt.set(input.flowAttemptId, record);
    return record;
  }

  // Mismo criterio que SupabaseExperimentRepository: delete_after > now()
  // para seguir siendo valido; una fila caducada se trata como
  // inexistente y nunca se reutiliza (VEGA_Base_Juridica_Segmento_B_v1.md,
  // revision de seguridad 2026-10-07).
  async getPartnerDerivedProfileByFlowAttempt(flowAttemptId: string): Promise<PartnerDerivedProfileRecord | null> {
    const record = this.partnerDerivedProfileByFlowAttempt.get(flowAttemptId);
    if (!record) return null;
    if (new Date(record.deleteAfter).getTime() <= Date.now()) return null;
    return record;
  }

  async deletePartnerDerivedProfile(flowAttemptId: string): Promise<void> {
    this.partnerDerivedProfileByFlowAttempt.delete(flowAttemptId);
  }

  async createPreview(input: CreatePreviewInput): Promise<PreviewRecord> {
    const record: PreviewRecord = {
      id: crypto.randomUUID(),
      flowAttemptId: input.flowAttemptId,
      schemaVersion: input.schemaVersion,
      promptVersion: input.promptVersion,
      modelId: input.modelId,
      partnerPrecision: input.partnerPrecision,
      chartId: input.chartId,
      evidenceSchemaVersion: input.evidenceSchemaVersion,
      factsVersion: input.factsVersion,
      claimsVersion: input.claimsVersion,
      timeKnown: input.timeKnown,
      chartIdB: input.chartIdB ?? null,
      synastryFactsVersion: input.synastryFactsVersion ?? null,
      synastryClaimsVersion: input.synastryClaimsVersion ?? null,
      synastryEvidenceSchemaVersion: input.synastryEvidenceSchemaVersion ?? null,
      timeKnownB: input.timeKnownB ?? null,
      evidenceIdsUsed: input.evidenceIdsUsed,
      preview: input.preview,
      generationStatus: input.generationStatus,
      errorType: input.errorType,
      latencyMs: input.latencyMs,
      usedFreeText: input.usedFreeText,
      createdAt: new Date().toISOString(),
    };
    const existing = this.previewsByFlowAttempt.get(input.flowAttemptId) ?? [];
    this.previewsByFlowAttempt.set(input.flowAttemptId, [...existing, record]);
    return record;
  }

  async getValidPreviewByFlowAttempt(flowAttemptId: string): Promise<PreviewRecord | null> {
    const records = this.previewsByFlowAttempt.get(flowAttemptId) ?? [];
    const valid = records.filter((record) => record.generationStatus === "valid");
    return valid.at(-1) ?? null;
  }

  async deletePreviewsForFlowAttempt(flowAttemptId: string): Promise<void> {
    this.previewsByFlowAttempt.delete(flowAttemptId);
  }

  async createPricedAccessIntentIfNotExists(
    input: CreatePricedAccessIntentInput
  ): Promise<CreateIfNotExistsResult<PricedAccessIntentRecord>> {
    const existing = this.pricedAccessIntentByFlowAttempt.get(input.flowAttemptId);
    if (existing) return { record: existing, wasNew: false };

    const record: PricedAccessIntentRecord = {
      id: crypto.randomUUID(),
      flowAttemptId: input.flowAttemptId,
      priceMinor: input.priceMinor,
      currency: input.currency,
      createdAt: new Date().toISOString(),
    };
    this.pricedAccessIntentByFlowAttempt.set(input.flowAttemptId, record);
    return { record, wasNew: true };
  }

  async getPricedAccessIntentByFlowAttempt(flowAttemptId: string): Promise<PricedAccessIntentRecord | null> {
    return this.pricedAccessIntentByFlowAttempt.get(flowAttemptId) ?? null;
  }

  async createWaitlistEntryIfNotExists(
    input: CreateWaitlistEntryInput
  ): Promise<CreateIfNotExistsResult<WaitlistRecord>> {
    const existing = this.waitlistEntryByFlowAttempt.get(input.flowAttemptId);
    if (existing) return { record: existing, wasNew: false };

    const record: WaitlistRecord = {
      id: crypto.randomUUID(),
      flowAttemptId: input.flowAttemptId,
      email: input.email,
      consentVersion: input.consentVersion,
      confirmationStatus: "pending",
      createdAt: new Date().toISOString(),
    };
    this.waitlistEntryByFlowAttempt.set(input.flowAttemptId, record);
    return { record, wasNew: true };
  }

  async getWaitlistEntryByFlowAttempt(flowAttemptId: string): Promise<WaitlistRecord | null> {
    return this.waitlistEntryByFlowAttempt.get(flowAttemptId) ?? null;
  }

  async deleteWaitlistEntry(flowAttemptId: string): Promise<void> {
    this.waitlistEntryByFlowAttempt.delete(flowAttemptId);
  }

  // Replica perform_delete_all_own_data(): bloquea (nunca destruye) los
  // ciclos de consentimiento del free_text de cada intento del usuario
  // antes de borrar su contenido, despues borra el nucleo purgable de
  // TODOS sus intentos y, por ultimo, el perfil propio una sola vez.
  // Sin transaccion real que revertir (este driver es un sandbox
  // sincrono entre awaits), pero replica el mismo resultado final que
  // la RPC produce cuando no hay ningun fallo a mitad.
  async performDeleteAllOwnData(userId: string): Promise<DeleteAllOwnDataResult> {
    const attempts = await this.listFlowAttemptsForUser(userId);
    let waitlistEntryDeleted = false;

    for (const attempt of attempts) {
      const cycles = this.freeTextConsentCyclesByFlowAttempt.get(attempt.id) ?? [];
      for (const cycle of cycles) {
        if (cycle.lifecycleState !== "active") continue;
        if (cycle.closeReason === null) cycle.closeReason = "erasure_requested";
        cycle.lifecycleState = "blocked";
      }

      await this.deleteProblemContext(attempt.id);
      await this.deletePartnerInput(attempt.id);
      await this.deletePartnerDerivedProfile(attempt.id);
      await this.deletePreviewsForFlowAttempt(attempt.id);

      const waitlistEntry = await this.getWaitlistEntryByFlowAttempt(attempt.id);
      if (waitlistEntry) {
        await this.deleteWaitlistEntry(attempt.id);
        waitlistEntryDeleted = true;
      }
    }

    await this.deleteOwnBirthProfile(userId);

    return { flowAttemptsAffected: attempts.length, waitlistEntryDeleted };
  }
}
