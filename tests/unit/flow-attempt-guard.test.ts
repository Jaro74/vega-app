import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { AcquisitionData } from "@/libs/db/types";
import { InMemoryExperimentRepository } from "@/libs/db/memory-repository";
import { requireOwnedFlowAttempt } from "@/libs/experiment/flow-attempt-guard";
import { signSessionCredential } from "@/libs/experiment/session-credential";

const ACQUISITION: AcquisitionData = {
  trafficSource: "direct",
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmContent: null,
  placement: null,
  deviceType: null,
};

async function createUserWithAttempt(repository: InMemoryExperimentRepository, anonymousUserId: string) {
  const user = await repository.findOrCreateExperimentUser({
    anonymousUserId,
    experimentId: "vega_beachhead_v1",
    acquisition: ACQUISITION,
    isTest: false,
  });
  const attempt = await repository.createFlowAttempt({ userId: user.id, segment: "A" });
  return { user, attempt };
}

function buildRequestWithSessionCookie(value: string | null): NextRequest {
  const headers = new Headers();
  if (value !== null) headers.set("cookie", `vega_session=${value}`);
  return new NextRequest(new URL("/api/priced-intent", "http://localhost:3000"), { headers });
}

describe("requireOwnedFlowAttempt", () => {
  let repository: InMemoryExperimentRepository;
  const originalSecret = process.env.EXPERIMENT_SESSION_SECRET;

  beforeEach(() => {
    repository = new InMemoryExperimentRepository();
    process.env.EXPERIMENT_SESSION_SECRET = "test-secret-solo-para-unit-tests";
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.EXPERIMENT_SESSION_SECRET;
    } else {
      process.env.EXPERIMENT_SESSION_SECRET = originalSecret;
    }
  });

  it("devuelve denied sin cookie vega_session", async () => {
    const { attempt } = await createUserWithAttempt(repository, "auid-1");
    const result = await requireOwnedFlowAttempt(repository, buildRequestWithSessionCookie(null), attempt.id);
    expect(result.status).toBe("denied");
  });

  it("devuelve denied con una cookie vega_session con formato/firma invalida", async () => {
    const { attempt } = await createUserWithAttempt(repository, "auid-1");
    const result = await requireOwnedFlowAttempt(repository, buildRequestWithSessionCookie("no-valida"), attempt.id);
    expect(result.status).toBe("denied");
  });

  it("devuelve denied si la credencial es valida pero no existe experiment_users para ese anonymousUserId", async () => {
    const token = signSessionCredential("auid-sin-usuario");
    const result = await requireOwnedFlowAttempt(repository, buildRequestWithSessionCookie(token), "cualquier-id");
    expect(result.status).toBe("denied");
  });

  it("devuelve denied si el flowAttemptId no existe", async () => {
    await createUserWithAttempt(repository, "auid-1");
    const token = signSessionCredential("auid-1");
    const result = await requireOwnedFlowAttempt(repository, buildRequestWithSessionCookie(token), "flow-inexistente");
    expect(result.status).toBe("denied");
  });

  it("devuelve denied si el flowAttemptId pertenece a otro usuario", async () => {
    const { attempt: victimAttempt } = await createUserWithAttempt(repository, "auid-victima");
    await createUserWithAttempt(repository, "auid-atacante");
    const attackerToken = signSessionCredential("auid-atacante");

    const result = await requireOwnedFlowAttempt(
      repository,
      buildRequestWithSessionCookie(attackerToken),
      victimAttempt.id
    );
    expect(result.status).toBe("denied");
  });

  it("devuelve ok con el attempt si el flowAttemptId pertenece al usuario de la credencial", async () => {
    const { attempt } = await createUserWithAttempt(repository, "auid-1");
    const token = signSessionCredential("auid-1");

    const result = await requireOwnedFlowAttempt(repository, buildRequestWithSessionCookie(token), attempt.id);
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.attempt.id).toBe(attempt.id);
  });

  it("un mismo usuario con intento primario y secundario: ambos devuelven ok", async () => {
    const { user, attempt: primary } = await createUserWithAttempt(repository, "auid-1");
    const secondary = await repository.createFlowAttempt({ userId: user.id, segment: "B" });
    const token = signSessionCredential("auid-1");

    const primaryResult = await requireOwnedFlowAttempt(repository, buildRequestWithSessionCookie(token), primary.id);
    const secondaryResult = await requireOwnedFlowAttempt(
      repository,
      buildRequestWithSessionCookie(token),
      secondary.id
    );

    expect(primaryResult.status).toBe("ok");
    expect(secondaryResult.status).toBe("ok");
  });
});
