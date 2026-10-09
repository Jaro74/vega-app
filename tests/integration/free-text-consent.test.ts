import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { GET as sessionGET } from "@/app/api/session/route";
import { POST as segmentPOST } from "@/app/api/segment/route";
import { POST as problemPOST } from "@/app/api/problem/route";
import { POST as withdrawFreeTextConsentPOST } from "@/app/api/privacy/withdraw-free-text-consent/route";
import { getExperimentRepository, resetExperimentRepositoryForTests } from "@/libs/db";
import type {
  ApiErrorResponse,
  PrivacyWithdrawFreeTextConsentResponse,
  ProblemResponse,
  SegmentResponse,
} from "@/types/api";

import { TestCookieJar } from "./test-cookie-jar";

// POST /api/privacy/withdraw-free-text-consent: cubre la orquestacion
// HTTP/cookies/ownership de la retirada del consentimiento del free_text.
// La maquina de estados en si (granted/withdrawn/version_conflict) ya
// esta cubierta en tests/unit/onboarding-service.test.ts y
// tests/unit/memory-repository.test.ts -- este archivo solo verifica
// que la ruta la expone correctamente sobre sesiones reales.

function buildRequest(path: string, cookies: Record<string, string> = {}, init: { method?: "GET" | "POST"; body?: string } = {}): NextRequest {
  const cookiesWithTestFlag = { vega_test: "1", ...cookies };
  const cookieHeader = Object.entries(cookiesWithTestFlag)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");

  const headers = new Headers();
  if (init.body) headers.set("content-type", "application/json");
  if (cookieHeader) headers.set("cookie", cookieHeader);

  return new NextRequest(new URL(path, "http://localhost:3000"), { method: init.method, body: init.body, headers });
}

async function startAttempt(segment: "A" | "B" = "A") {
  const jar = new TestCookieJar();
  jar.apply(await sessionGET(buildRequest("/api/session", jar.asRecord())));

  const segmentResponse = await segmentPOST(
    buildRequest("/api/segment", jar.asRecord(), { method: "POST", body: JSON.stringify({ segment }) })
  );
  jar.apply(segmentResponse);
  const segmentBody = (await segmentResponse.json()) as SegmentResponse;

  return { jar, flowAttemptId: segmentBody.flowAttemptId };
}

async function submitProblemWithFreeText(jar: TestCookieJar, flowAttemptId: string, freeText: string, consentVersion = "v1") {
  return problemPOST(
    buildRequest("/api/problem", jar.asRecord(), {
      method: "POST",
      body: JSON.stringify({
        flowAttemptId,
        trigger: "career",
        freeText,
        freeTextConsentGiven: true,
        freeTextConsentVersion: consentVersion,
      }),
    })
  );
}

function withdraw(jar: TestCookieJar, flowAttemptId: string) {
  return withdrawFreeTextConsentPOST(
    buildRequest("/api/privacy/withdraw-free-text-consent", jar.asRecord(), {
      method: "POST",
      body: JSON.stringify({ flowAttemptId }),
    })
  );
}

describe("POST /api/privacy/withdraw-free-text-consent", () => {
  beforeEach(() => {
    resetExperimentRepositoryForTests();
  });

  it("retira un consentimiento vigente: borra el texto y responde withdrawn", async () => {
    const { jar, flowAttemptId } = await startAttempt("A");
    const problemResponse = await submitProblemWithFreeText(jar, flowAttemptId, "Un texto de prueba");
    expect((await problemResponse.json() as ProblemResponse).ok).toBe(true);

    const response = await withdraw(jar, flowAttemptId);
    expect(response.status).toBe(200);
    const body = (await response.json()) as PrivacyWithdrawFreeTextConsentResponse;
    expect(body.outcome).toBe("withdrawn");

    const repository = getExperimentRepository();
    const problemContext = await repository.getProblemContextByFlowAttempt(flowAttemptId);
    expect(problemContext?.freeText).toBeNull();
    expect(problemContext?.textProvided).toBe(false);
  });

  it("es idempotente: retirar dos veces devuelve already_withdrawn la segunda vez", async () => {
    const { jar, flowAttemptId } = await startAttempt("A");
    await submitProblemWithFreeText(jar, flowAttemptId, "Un texto de prueba");

    await withdraw(jar, flowAttemptId);
    const second = await withdraw(jar, flowAttemptId);
    const body = (await second.json()) as PrivacyWithdrawFreeTextConsentResponse;
    expect(body.outcome).toBe("already_withdrawn");
  });

  it("sin ningun consentimiento previo devuelve no_consent", async () => {
    const { jar, flowAttemptId } = await startAttempt("A");

    const response = await withdraw(jar, flowAttemptId);
    const body = (await response.json()) as PrivacyWithdrawFreeTextConsentResponse;
    expect(body.outcome).toBe("no_consent");
  });

  it("un flow_attempt_id de otra sesion devuelve 404, nunca opera sobre datos ajenos", async () => {
    const { flowAttemptId } = await startAttempt("A");
    const attackerJar = new TestCookieJar();
    attackerJar.apply(await sessionGET(buildRequest("/api/session", attackerJar.asRecord())));

    const response = await withdraw(attackerJar, flowAttemptId);
    expect(response.status).toBe(404);
  });

  it("sin sesion devuelve 404 (mismo guard que las rutas de negocio)", async () => {
    const { flowAttemptId } = await startAttempt("A");

    const response = await withdrawFreeTextConsentPOST(
      buildRequest("/api/privacy/withdraw-free-text-consent", {}, { method: "POST", body: JSON.stringify({ flowAttemptId }) })
    );
    expect(response.status).toBe(404);
  });
});

describe("POST /api/problem — consentimiento del free_text", () => {
  beforeEach(() => {
    resetExperimentRepositoryForTests();
  });

  it("version_conflict: no se puede resolver silenciosamente via HTTP", async () => {
    const { jar, flowAttemptId } = await startAttempt("A");
    await submitProblemWithFreeText(jar, flowAttemptId, "Texto inicial", "v1");

    const response = await submitProblemWithFreeText(jar, flowAttemptId, "Texto editado", "v2");
    expect(response.status).toBe(409);
    const body = (await response.json()) as ApiErrorResponse;
    expect(body.error).toBe("version_conflict");
  });

  it("rechaza con 400 un texto que el filtro marca como datos de otra persona", async () => {
    const { jar, flowAttemptId } = await startAttempt("A");

    const response = await submitProblemWithFreeText(
      jar,
      flowAttemptId,
      "Mi pareja tiene depresion y no sabe como contarselo a su familia"
    );
    expect(response.status).toBe(400);

    const repository = getExperimentRepository();
    const problemContext = await repository.getProblemContextByFlowAttempt(flowAttemptId);
    expect(problemContext).toBeNull();
  });
});
