import { beforeEach, describe, expect, it } from "vitest";

import type { AcquisitionData } from "@/libs/db/types";
import { InMemoryExperimentRepository } from "@/libs/db/memory-repository";
import {
  buildPrivacySummary,
  deleteAllOwnData,
  deleteOwnWaitlistEntry,
} from "@/libs/experiment/privacy-service";

const ACQUISITION: AcquisitionData = {
  trafficSource: "direct",
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmContent: null,
  placement: null,
  deviceType: null,
};

describe("privacy-service", () => {
  let repository: InMemoryExperimentRepository;

  beforeEach(() => {
    repository = new InMemoryExperimentRepository();
  });

  async function createUserWithAttempt(segment: "A" | "B" = "A") {
    const user = await repository.findOrCreateExperimentUser({
      anonymousUserId: crypto.randomUUID(),
      experimentId: "vega_beachhead_v1",
      acquisition: ACQUISITION,
      isTest: true,
    });
    const attempt = await repository.createFlowAttempt({ userId: user.id, segment });
    return { user, attempt };
  }

  async function fillCoreData(flowAttemptId: string, userId: string) {
    await repository.upsertProblemContext({
      flowAttemptId,
      trigger: "career",
      freeText: "texto",
      textProvided: true,
    });
    await repository.upsertOwnBirthProfile({
      userId,
      birthDate: "1990-01-01",
      birthTime: null,
      birthTimeKnown: false,
      place: {
        placeLabel: "Madrid",
        countryCode: "ES",
        latitude: 40.4,
        longitude: -3.7,
        timezoneId: "Europe/Madrid",
      },
    });
    await repository.createPreview({
      flowAttemptId,
      schemaVersion: "preview_v1",
      promptVersion: "prompt_v1",
      modelId: "gpt-5.6-luna",
      partnerPrecision: null,
      chartId: "chart-1",
      evidenceSchemaVersion: "evidence_v1",
      factsVersion: "facts_v1",
      claimsVersion: "claims_v1",
      timeKnown: false,
      evidenceIdsUsed: ["ev-1", "ev-2"],
      preview: null,
      generationStatus: "valid",
      errorType: null,
      latencyMs: 120,
      usedFreeText: false,
    });
  }

  describe("buildPrivacySummary", () => {
    it("refleja la existencia de cada categoria sin exponer contenido en bruto", async () => {
      const { user, attempt } = await createUserWithAttempt();
      await fillCoreData(attempt.id, user.id);
      await repository.createWaitlistEntryIfNotExists({
        flowAttemptId: attempt.id,
        email: "persona@example.com",
        consentVersion: "waitlist_consent_v1",
      });

      const summary = await buildPrivacySummary(repository, user);

      expect(summary.anonymousUserId).toBe(user.anonymousUserId);
      expect(summary.hasOwnBirthProfile).toBe(true);
      expect(summary.flowAttempts).toHaveLength(1);
      const [attemptSummary] = summary.flowAttempts;
      expect(attemptSummary.hasProblemContext).toBe(true);
      expect(attemptSummary.hasValidPreview).toBe(true);
      expect(attemptSummary.waitlistEntry).toEqual({
        email: "persona@example.com",
        createdAt: expect.any(String),
        consentVersion: "waitlist_consent_v1",
      });
      // Nunca se expone el texto libre, la fecha de nacimiento ni ningun
      // dato en bruto -- solo flags de existencia (salvo el email de
      // waitlist, el propio dato de contacto del usuario).
      expect(JSON.stringify(summary)).not.toContain("texto");
      expect(JSON.stringify(summary)).not.toContain("1990-01-01");
    });

    it("sin ningun flow_attempt, devuelve la lista vacia y hasOwnBirthProfile en false", async () => {
      const user = await repository.findOrCreateExperimentUser({
        anonymousUserId: crypto.randomUUID(),
        experimentId: "vega_beachhead_v1",
        acquisition: ACQUISITION,
        isTest: true,
      });

      const summary = await buildPrivacySummary(repository, user);

      expect(summary.hasOwnBirthProfile).toBe(false);
      expect(summary.flowAttempts).toHaveLength(0);
    });

    it("con un flow_attempt recien creado y sin datos, todas las flags de esa categoria son false", async () => {
      const { user, attempt } = await createUserWithAttempt();
      const summary = await buildPrivacySummary(repository, user);

      expect(summary.flowAttempts).toHaveLength(1);
      const [attemptSummary] = summary.flowAttempts;
      expect(attemptSummary.flowAttemptId).toBe(attempt.id);
      expect(attemptSummary.hasProblemContext).toBe(false);
      expect(attemptSummary.hasPartnerInputPending).toBe(false);
      expect(attemptSummary.hasPartnerDerivedProfile).toBe(false);
      expect(attemptSummary.hasValidPreview).toBe(false);
      expect(attemptSummary.hasPricedAccessIntent).toBe(false);
      expect(attemptSummary.waitlistEntry).toBeNull();
    });

    it("incluye todos los intentos del usuario, no solo el primario", async () => {
      const { user, attempt: primary } = await createUserWithAttempt("A");
      const secondary = await repository.createFlowAttempt({ userId: user.id, segment: "B" });

      const summary = await buildPrivacySummary(repository, user);

      const ids = summary.flowAttempts.map((a) => a.flowAttemptId);
      expect(ids).toContain(primary.id);
      expect(ids).toContain(secondary.id);
    });
  });

  describe("deleteAllOwnData", () => {
    it("borra el nucleo purgable y la waitlist de todos los intentos, y el perfil propio una sola vez", async () => {
      const { user, attempt } = await createUserWithAttempt();
      await fillCoreData(attempt.id, user.id);
      await repository.upsertPartnerInput({
        flowAttemptId: attempt.id,
        birthDate: "1991-02-02",
        birthTime: null,
        birthTimeKnown: false,
        place: null,
      });
      await repository.upsertPartnerDerivedProfile({
        flowAttemptId: attempt.id,
        partnerPrecision: "partial",
        derivedFeatures: { status: "insufficient_data", reason: "participant_minimal", insufficientParticipants: ["b"] },
      });
      await repository.createWaitlistEntryIfNotExists({
        flowAttemptId: attempt.id,
        email: "persona@example.com",
        consentVersion: "waitlist_consent_v1",
      });

      const result = await deleteAllOwnData(repository, user.id);

      expect(result).toEqual({ flowAttemptsAffected: 1, waitlistEntryDeleted: true });
      expect(await repository.getProblemContextByFlowAttempt(attempt.id)).toBeNull();
      expect(await repository.getOwnBirthProfileByUser(user.id)).toBeNull();
      expect(await repository.getPartnerInputByFlowAttempt(attempt.id)).toBeNull();
      expect(await repository.getPartnerDerivedProfileByFlowAttempt(attempt.id)).toBeNull();
      expect(await repository.getValidPreviewByFlowAttempt(attempt.id)).toBeNull();
      expect(await repository.getWaitlistEntryByFlowAttempt(attempt.id)).toBeNull();
    });

    it("borra el historial de free_text_consent_events del intento (no depende de on delete cascade hacia flow_attempts, que se conserva)", async () => {
      const { user, attempt } = await createUserWithAttempt();
      await fillCoreData(attempt.id, user.id);

      // Antes: un evento 'granted' real, creado por la misma RPC/estado
      // que usa el flujo de produccion -- no un upsert directo.
      const granted = await repository.submitProblemContextWithFreeText({
        flowAttemptId: attempt.id,
        trigger: "career",
        freeText: "un texto con consentimiento",
        consentVersion: "v1",
      });
      expect(granted.outcome).toBe("ok");

      await deleteAllOwnData(repository, user.id);

      // Despues: no debe quedar ningun evento para este intento. No hay
      // un metodo de lectura publico sobre free_text_consent_events (es
      // un historial de auditoria, no un dato que la app consulte
      // directamente) -- se verifica por el unico contrato publico que
      // depende de su estado: withdrawFreeTextConsent solo devuelve
      // "no_consent" cuando no existe ningun evento previo.
      const afterDelete = await repository.withdrawFreeTextConsent(attempt.id);
      expect(afterDelete.outcome).toBe("no_consent");

      // flow_attempts se conserva (cascara) -- el borrado de arriba fue
      // real, no un efecto accidental de haber borrado el padre.
      expect(await repository.getFlowAttemptById(attempt.id)).not.toBeNull();
    });

    it("nunca toca experiment_users, flow_attempts ni priced_access_intents", async () => {
      const { user, attempt } = await createUserWithAttempt();
      await fillCoreData(attempt.id, user.id);
      await repository.updateFlowAttemptProgress({
        flowAttemptId: attempt.id,
        currentStep: "preview",
        trigger: "career",
        completedAt: new Date().toISOString(),
      });
      await repository.createPricedAccessIntentIfNotExists({
        flowAttemptId: attempt.id,
        priceMinor: 999,
        currency: "EUR",
      });

      await deleteAllOwnData(repository, user.id);

      const stillThere = await repository.getFlowAttemptById(attempt.id);
      expect(stillThere).not.toBeNull();
      expect(stillThere?.currentStep).toBe("preview");
      expect(stillThere?.trigger).toBe("career");
      expect(stillThere?.completedAt).not.toBeNull();
      expect(await repository.getExperimentUserByAnonymousId(user.anonymousUserId)).not.toBeNull();
      expect(await repository.getPricedAccessIntentByFlowAttempt(attempt.id)).not.toBeNull();
    });

    it("es idempotente: ejecutarlo dos veces no lanza y la segunda vez no encuentra waitlist que borrar", async () => {
      const { user, attempt } = await createUserWithAttempt();
      await fillCoreData(attempt.id, user.id);
      await repository.createWaitlistEntryIfNotExists({
        flowAttemptId: attempt.id,
        email: "persona@example.com",
        consentVersion: "waitlist_consent_v1",
      });

      await deleteAllOwnData(repository, user.id);
      const second = await deleteAllOwnData(repository, user.id);

      expect(second).toEqual({ flowAttemptsAffected: 1, waitlistEntryDeleted: false });
    });

    it("recorre todos los intentos del usuario, no solo el primario", async () => {
      const { user, attempt: primary } = await createUserWithAttempt("A");
      const secondary = await repository.createFlowAttempt({ userId: user.id, segment: "B" });
      await fillCoreData(primary.id, user.id);
      await repository.upsertProblemContext({
        flowAttemptId: secondary.id,
        trigger: "breakup",
        freeText: null,
        textProvided: false,
      });

      const result = await deleteAllOwnData(repository, user.id);

      expect(result.flowAttemptsAffected).toBe(2);
      expect(await repository.getProblemContextByFlowAttempt(primary.id)).toBeNull();
      expect(await repository.getProblemContextByFlowAttempt(secondary.id)).toBeNull();
    });
  });

  describe("deleteOwnWaitlistEntry", () => {
    it("borra unicamente la waitlist, sin afectar al resto del nucleo", async () => {
      const { user, attempt } = await createUserWithAttempt();
      await fillCoreData(attempt.id, user.id);
      await repository.createWaitlistEntryIfNotExists({
        flowAttemptId: attempt.id,
        email: "persona@example.com",
        consentVersion: "waitlist_consent_v1",
      });

      const result = await deleteOwnWaitlistEntry(repository, user.id);

      expect(result).toEqual({ deleted: true });
      expect(await repository.getWaitlistEntryByFlowAttempt(attempt.id)).toBeNull();
      // El resto del nucleo sigue intacto.
      expect(await repository.getProblemContextByFlowAttempt(attempt.id)).not.toBeNull();
      expect(await repository.getOwnBirthProfileByUser(user.id)).not.toBeNull();
      expect(await repository.getValidPreviewByFlowAttempt(attempt.id)).not.toBeNull();
    });

    it("es idempotente: sin ninguna entrada, devuelve deleted:false sin lanzar", async () => {
      const { user } = await createUserWithAttempt();

      const result = await deleteOwnWaitlistEntry(repository, user.id);

      expect(result).toEqual({ deleted: false });
    });
  });
});
