import { describe, expect, it } from "vitest";

import { InMemoryExperimentRepository } from "@/libs/db/memory-repository";
import type {
  AcquisitionData,
  CreateFlowAttemptInput,
  ExperimentRepository,
  FlowAttemptRecord,
} from "@/libs/db/types";
import { UniqueConstraintViolationError } from "@/libs/db/types";
import { bootstrapSession, selectSegment } from "@/libs/experiment/session-service";

const acquisition: AcquisitionData = {
  trafficSource: "direct",
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmContent: null,
  placement: null,
  deviceType: "desktop",
};

describe("bootstrapSession", () => {
  it("genera un anonymous_user_id nuevo cuando no hay cookie", async () => {
    const repository = new InMemoryExperimentRepository();

    const result = await bootstrapSession(repository, {
      anonymousUserId: null,
      existingFlowAttemptId: null,
      acquisition,
      isTest: false,
    });

    expect(result.isNewAnonymousUser).toBe(true);
    expect(result.anonymousUserId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.activeAttempt).toBeNull();
  });

  it("reutiliza el usuario existente cuando la cookie ya trae un anonymous_user_id", async () => {
    const repository = new InMemoryExperimentRepository();
    const first = await bootstrapSession(repository, {
      anonymousUserId: null,
      existingFlowAttemptId: null,
      acquisition,
      isTest: false,
    });

    const second = await bootstrapSession(repository, {
      anonymousUserId: first.anonymousUserId,
      existingFlowAttemptId: null,
      acquisition,
      isTest: false,
    });

    expect(second.isNewAnonymousUser).toBe(false);
    expect(second.userId).toBe(first.userId);
  });

  it("no recupera un flow_attempt que pertenece a otro usuario", async () => {
    const repository = new InMemoryExperimentRepository();
    const userA = await bootstrapSession(repository, {
      anonymousUserId: null,
      existingFlowAttemptId: null,
      acquisition,
      isTest: false,
    });
    const attemptA = await selectSegment(repository, {
      userId: userA.userId,
      requestedSegment: "A",
      existingFlowAttemptId: null,
    });

    const userB = await bootstrapSession(repository, {
      anonymousUserId: null,
      existingFlowAttemptId: attemptA.flowAttemptId,
      acquisition,
      isTest: false,
    });

    expect(userB.activeAttempt).toBeNull();
  });
});

describe("selectSegment", () => {
  it("reutiliza el mismo flow_attempt_id al reelegir el mismo segmento (idempotente)", async () => {
    const repository = new InMemoryExperimentRepository();
    const bootstrap = await bootstrapSession(repository, {
      anonymousUserId: null,
      existingFlowAttemptId: null,
      acquisition,
      isTest: false,
    });

    const first = await selectSegment(repository, {
      userId: bootstrap.userId,
      requestedSegment: "A",
      existingFlowAttemptId: null,
    });
    const second = await selectSegment(repository, {
      userId: bootstrap.userId,
      requestedSegment: "A",
      existingFlowAttemptId: first.flowAttemptId,
    });

    expect(second.flowAttemptId).toBe(first.flowAttemptId);
    expect(second.created).toBe(false);
    expect(await repository.countFlowAttemptsForUser(bootstrap.userId)).toBe(1);
  });

  it("crea un intento nuevo secundario al cambiar de segmento sin sustituir el primario", async () => {
    const repository = new InMemoryExperimentRepository();
    const bootstrap = await bootstrapSession(repository, {
      anonymousUserId: null,
      existingFlowAttemptId: null,
      acquisition,
      isTest: false,
    });

    const primary = await selectSegment(repository, {
      userId: bootstrap.userId,
      requestedSegment: "A",
      existingFlowAttemptId: null,
    });
    const secondary = await selectSegment(repository, {
      userId: bootstrap.userId,
      requestedSegment: "B",
      existingFlowAttemptId: primary.flowAttemptId,
    });

    expect(secondary.flowAttemptId).not.toBe(primary.flowAttemptId);
    expect(primary.isPrimaryAttempt).toBe(true);
    expect(secondary.isPrimaryAttempt).toBe(false);

    const stillPrimary = await repository.getPrimaryFlowAttempt(bootstrap.userId);
    expect(stillPrimary?.id).toBe(primary.flowAttemptId);
  });

  it("recupera el intento primario si createFlowAttempt lanza una violacion de unicidad (carrera)", async () => {
    const existingPrimary: FlowAttemptRecord = {
      id: "existing-primary",
      userId: "user-1",
      segment: "A",
      trigger: null,
      currentStep: null,
      partnerPrecision: null,
      isPrimaryAttempt: true,
      startedAt: new Date().toISOString(),
      completedAt: null,
    };

    const racyRepository: ExperimentRepository = {
      async findOrCreateExperimentUser() {
        throw new Error("no usado en este test");
      },
      async getExperimentUserByAnonymousId() {
        return null;
      },
      async countFlowAttemptsForUser() {
        return 0;
      },
      async getFlowAttemptById() {
        return null;
      },
      async getPrimaryFlowAttempt() {
        return existingPrimary;
      },
      async listFlowAttemptsForUser() {
        return [];
      },
      async createFlowAttempt(_input: CreateFlowAttemptInput) {
        throw new UniqueConstraintViolationError("carrera simulada");
      },
      async updateFlowAttemptProgress() {
        throw new Error("no usado en este test");
      },
      async upsertProblemContext() {
        throw new Error("no usado en este test");
      },
      async getProblemContextByFlowAttempt() {
        return null;
      },
      async deleteProblemContext() {
        throw new Error("no usado en este test");
      },
      async submitProblemContextWithFreeText() {
        throw new Error("no usado en este test");
      },
      async withdrawFreeTextConsent() {
        throw new Error("no usado en este test");
      },
      async deleteFreeTextConsentEvents() {
        throw new Error("no usado en este test");
      },
      async upsertOwnBirthProfile() {
        throw new Error("no usado en este test");
      },
      async getOwnBirthProfileByUser() {
        return null;
      },
      async deleteOwnBirthProfile() {
        throw new Error("no usado en este test");
      },
      async upsertPartnerInput() {
        throw new Error("no usado en este test");
      },
      async getPartnerInputByFlowAttempt() {
        return null;
      },
      async deletePartnerInput() {
        throw new Error("no usado en este test");
      },
      async upsertPartnerDerivedProfile() {
        throw new Error("no usado en este test");
      },
      async getPartnerDerivedProfileByFlowAttempt() {
        return null;
      },
      async deletePartnerDerivedProfile() {
        throw new Error("no usado en este test");
      },
      async createPreview() {
        throw new Error("no usado en este test");
      },
      async getValidPreviewByFlowAttempt() {
        return null;
      },
      async deletePreviewsForFlowAttempt() {
        throw new Error("no usado en este test");
      },
      async createPricedAccessIntentIfNotExists() {
        throw new Error("no usado en este test");
      },
      async getPricedAccessIntentByFlowAttempt() {
        return null;
      },
      async createWaitlistEntryIfNotExists() {
        throw new Error("no usado en este test");
      },
      async getWaitlistEntryByFlowAttempt() {
        return null;
      },
      async deleteWaitlistEntry() {
        throw new Error("no usado en este test");
      },
    };

    const result = await selectSegment(racyRepository, {
      userId: "user-1",
      requestedSegment: "A",
      existingFlowAttemptId: null,
    });

    expect(result.flowAttemptId).toBe(existingPrimary.id);
    expect(result.isPrimaryAttempt).toBe(true);
    expect(result.created).toBe(false);
  });
});
