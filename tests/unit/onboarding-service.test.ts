import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryExperimentRepository } from "@/libs/db/memory-repository";
import {
  getResumeState,
  submitOwnProfile,
  submitPartner,
  submitProblem,
} from "@/libs/experiment/onboarding-service";

// geonameid reales del dataset GeoNames (data/places/cities.json).
const MADRID_PLACE_ID = 3117735;
const BARCELONA_PLACE_ID = 3128760;

describe("onboarding-service", () => {
  let repository: InMemoryExperimentRepository;

  beforeEach(() => {
    repository = new InMemoryExperimentRepository();
  });

  async function createAttempt(segment: "A" | "B") {
    const user = await repository.findOrCreateExperimentUser({
      anonymousUserId: crypto.randomUUID(),
      experimentId: "vega_beachhead_v1",
      acquisition: {
        trafficSource: "direct",
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmContent: null,
        placement: null,
        deviceType: null,
      },
      isTest: false,
    });
    const attempt = await repository.createFlowAttempt({ userId: user.id, segment });
    return { user, attempt };
  }

  describe("submitProblem", () => {
    it("persiste trigger + texto y avanza a own_profile_intro", async () => {
      const { attempt } = await createAttempt("A");

      const result = await submitProblem(repository, {
        flowAttemptId: attempt.id,
        trigger: "career",
        freeText: "Un texto de contexto",
      });

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.nextStep).toBe("own_profile_intro");

      const saved = await repository.getProblemContextByFlowAttempt(attempt.id);
      expect(saved?.trigger).toBe("career");
      expect(saved?.freeText).toBe("Un texto de contexto");
      expect(saved?.textProvided).toBe(true);

      const updatedAttempt = await repository.getFlowAttemptById(attempt.id);
      expect(updatedAttempt?.currentStep).toBe("problem_text");
      expect(updatedAttempt?.trigger).toBe("career");
    });

    it("es idempotente: reenviar el mismo flow_attempt_id no duplica problem_context", async () => {
      const { attempt } = await createAttempt("A");

      await submitProblem(repository, { flowAttemptId: attempt.id, trigger: "career" });
      await submitProblem(repository, { flowAttemptId: attempt.id, trigger: "career" });

      const saved = await repository.getProblemContextByFlowAttempt(attempt.id);
      expect(saved).not.toBeNull();
    });

    it("rechaza un trigger de B para un intento de segmento A", async () => {
      const { attempt } = await createAttempt("A");

      const result = await submitProblem(repository, { flowAttemptId: attempt.id, trigger: "breakup" });

      expect(result.ok).toBe(false);
      if (result.ok === false) expect(result.status).toBe(400);
    });

    it("devuelve 404 si el flow_attempt no existe", async () => {
      const result = await submitProblem(repository, {
        flowAttemptId: crypto.randomUUID(),
        trigger: "career",
      });

      expect(result.ok).toBe(false);
      if (result.ok === false) expect(result.status).toBe(404);
    });
  });

  describe("submitOwnProfile", () => {
    it("segmento A: precision full con hora conocida y termina el onboarding (nextStep preview)", async () => {
      const { attempt, user } = await createAttempt("A");

      const result = await submitOwnProfile(repository, {
        flowAttemptId: attempt.id,
        birthDate: "1990-05-12",
        birthTimeKnown: true,
        birthTime: "14:35",
        placeId: MADRID_PLACE_ID,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.precision).toBe("full");
        expect(result.nextStep).toBe("preview");
      }

      const profile = await repository.getOwnBirthProfileByUser(user.id);
      expect(profile?.placeLabel).toBe("Madrid");
      expect(profile?.timezoneId).toBe("Europe/Madrid");

      const updatedAttempt = await repository.getFlowAttemptById(attempt.id);
      expect(updatedAttempt?.currentStep).toBe("birth_place");
      expect(updatedAttempt?.completedAt).not.toBeNull();
    });

    // No afectado por el redondeo a 2 decimales aplicado solo a la
    // segunda persona del Segmento B (submitPartner) el 2026-10-08: el
    // perfil propio debe conservar la precision completa del dataset.
    it("conserva la precision completa del dataset (no se ve afectado por el redondeo de submitPartner)", async () => {
      const { attempt, user } = await createAttempt("A");

      await submitOwnProfile(repository, {
        flowAttemptId: attempt.id,
        birthDate: "1990-05-12",
        birthTimeKnown: true,
        birthTime: "14:35",
        placeId: MADRID_PLACE_ID,
      });

      const profile = await repository.getOwnBirthProfileByUser(user.id);
      expect(profile?.latitude).toBe(40.4165);
      expect(profile?.longitude).toBe(-3.70256);
    });

    it("segmento A: precision limited sin hora, nunca inventa un valor de birthTime", async () => {
      const { attempt, user } = await createAttempt("A");

      const result = await submitOwnProfile(repository, {
        flowAttemptId: attempt.id,
        birthDate: "1990-05-12",
        birthTimeKnown: false,
        placeId: MADRID_PLACE_ID,
      });

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.precision).toBe("limited");

      const profile = await repository.getOwnBirthProfileByUser(user.id);
      expect(profile?.birthTime).toBeNull();
      expect(profile?.birthTimeKnown).toBe(false);
    });

    it("segmento B: nextStep es 'partner' y el intento no se marca como completado todavia", async () => {
      const { attempt } = await createAttempt("B");

      const result = await submitOwnProfile(repository, {
        flowAttemptId: attempt.id,
        birthDate: "1990-05-12",
        birthTimeKnown: true,
        birthTime: "10:00",
        placeId: MADRID_PLACE_ID,
      });

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.nextStep).toBe("partner");

      const updatedAttempt = await repository.getFlowAttemptById(attempt.id);
      expect(updatedAttempt?.completedAt).toBeNull();
    });

    it("es idempotente: reenviar el perfil propio no duplica user_birth_profile", async () => {
      const { attempt, user } = await createAttempt("A");

      await submitOwnProfile(repository, {
        flowAttemptId: attempt.id,
        birthDate: "1990-05-12",
        birthTimeKnown: false,
        placeId: MADRID_PLACE_ID,
      });
      await submitOwnProfile(repository, {
        flowAttemptId: attempt.id,
        birthDate: "1990-05-12",
        birthTimeKnown: true,
        birthTime: "08:00",
        placeId: BARCELONA_PLACE_ID,
      });

      const profile = await repository.getOwnBirthProfileByUser(user.id);
      expect(profile?.placeLabel).toBe("Barcelona");
      expect(profile?.birthTimeKnown).toBe(true);
    });

    it("rechaza un placeId desconocido", async () => {
      const { attempt } = await createAttempt("A");

      const result = await submitOwnProfile(repository, {
        flowAttemptId: attempt.id,
        birthDate: "1990-05-12",
        birthTimeKnown: false,
        placeId: 999999,
      });

      expect(result.ok).toBe(false);
      if (result.ok === false) expect(result.status).toBe(400);
    });
  });

  describe("submitPartner", () => {
    it("full: fecha + hora + lugar -> partnerPrecision full", async () => {
      const { attempt } = await createAttempt("B");

      const result = await submitPartner(repository, {
        flowAttemptId: attempt.id,
        birthDate: "1988-03-02",
        birthTimeKnown: true,
        birthTime: "09:15",
        placeId: MADRID_PLACE_ID,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.partnerPrecision).toBe("full");
        expect(result.analysisPossible).toBe(true);
      }

      const updatedAttempt = await repository.getFlowAttemptById(attempt.id);
      expect(updatedAttempt?.partnerPrecision).toBe("full");
      expect(updatedAttempt?.completedAt).not.toBeNull();
    });

    // Minimizacion geografica de la segunda persona (VEGA_Base_Juridica_
    // Segmento_B_v1.md, bloque 5.B, prueba tecnica 2026-10-08): partner_input
    // nunca debe persistir la precision original de 4-5 decimales del
    // dataset para la segunda persona.
    it("redondea lat/lon de la segunda persona a 2 decimales a partir de la precision original del dataset", async () => {
      const { attempt } = await createAttempt("B");

      await submitPartner(repository, {
        flowAttemptId: attempt.id,
        birthDate: "1988-03-02",
        birthTimeKnown: true,
        birthTime: "09:15",
        placeId: MADRID_PLACE_ID,
      });

      const partnerInput = await repository.getPartnerInputByFlowAttempt(attempt.id);
      expect(partnerInput?.latitude).toBe(40.42);
      expect(partnerInput?.longitude).toBe(-3.7);
    });

    it("partial: fecha + lugar sin hora -> partnerPrecision partial, nunca inventa hora", async () => {
      const { attempt } = await createAttempt("B");

      const result = await submitPartner(repository, {
        flowAttemptId: attempt.id,
        birthDate: "1988-03-02",
        birthTimeKnown: false,
        placeId: MADRID_PLACE_ID,
      });

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.partnerPrecision).toBe("partial");

      const partnerInput = await repository.getPartnerInputByFlowAttempt(attempt.id);
      expect(partnerInput?.birthTime).toBeNull();
    });

    it("minimal: solo fecha -> partnerPrecision minimal", async () => {
      const { attempt } = await createAttempt("B");

      const result = await submitPartner(repository, {
        flowAttemptId: attempt.id,
        birthDate: "1988-03-02",
      });

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.partnerPrecision).toBe("minimal");

      const partnerInput = await repository.getPartnerInputByFlowAttempt(attempt.id);
      expect(partnerInput?.placeLabel).toBeNull();
    });

    it("rechaza datos de partner para un intento de segmento A", async () => {
      const { attempt } = await createAttempt("A");

      const result = await submitPartner(repository, { flowAttemptId: attempt.id, birthDate: "1988-03-02" });

      expect(result.ok).toBe(false);
      if (result.ok === false) expect(result.status).toBe(400);
    });

    it("es idempotente: reenviar los datos de partner no duplica partner_input", async () => {
      const { attempt } = await createAttempt("B");

      await submitPartner(repository, { flowAttemptId: attempt.id, birthDate: "1988-03-02" });
      await submitPartner(repository, {
        flowAttemptId: attempt.id,
        birthDate: "1988-03-02",
        birthTimeKnown: true,
        birthTime: "09:15",
        placeId: MADRID_PLACE_ID,
      });

      const partnerInput = await repository.getPartnerInputByFlowAttempt(attempt.id);
      expect(partnerInput?.placeLabel).toBe("Madrid");
    });

    it("Sprint 3B: reenviar datos de partner invalida cualquier partner_derived_profile cacheado", async () => {
      const { attempt } = await createAttempt("B");

      await repository.upsertPartnerDerivedProfile({
        flowAttemptId: attempt.id,
        partnerPrecision: "minimal",
        derivedFeatures: { status: "insufficient_data", reason: "participant_minimal", insufficientParticipants: ["b"] },
      });

      await submitPartner(repository, {
        flowAttemptId: attempt.id,
        birthDate: "1988-03-02",
        birthTimeKnown: true,
        birthTime: "09:15",
        placeId: MADRID_PLACE_ID,
      });

      const derived = await repository.getPartnerDerivedProfileByFlowAttempt(attempt.id);
      expect(derived).toBeNull();
    });
  });

  describe("getResumeState", () => {
    it("sin intento activo, devuelve estado vacio", async () => {
      const state = await getResumeState(repository, "user-desconocido", null);
      expect(state).toEqual({
        lastCompletedStep: null,
        birthDateCompleted: false,
        birthTimeKnown: null,
        waitlistSubmitted: false,
      });
    });

    it("tras completar el perfil propio, refleja birthDateCompleted y birthTimeKnown", async () => {
      const { attempt, user } = await createAttempt("A");
      await submitOwnProfile(repository, {
        flowAttemptId: attempt.id,
        birthDate: "1990-05-12",
        birthTimeKnown: false,
        placeId: MADRID_PLACE_ID,
      });

      const updatedAttempt = await repository.getFlowAttemptById(attempt.id);
      const state = await getResumeState(repository, user.id, updatedAttempt);

      expect(state.lastCompletedStep).toBe("birth_place");
      expect(state.birthDateCompleted).toBe(true);
      expect(state.birthTimeKnown).toBe(false);
    });
  });
});
