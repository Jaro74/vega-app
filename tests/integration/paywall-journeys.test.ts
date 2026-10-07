import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { GET as sessionGET } from "@/app/api/session/route";
import { POST as segmentPOST } from "@/app/api/segment/route";
import { POST as problemPOST } from "@/app/api/problem/route";
import { POST as ownProfilePOST } from "@/app/api/own-profile/route";
import { POST as previewPOST } from "@/app/api/preview/route";
import { POST as previewCompletePOST } from "@/app/api/preview/complete/route";
import { POST as pricedIntentPOST } from "@/app/api/priced-intent/route";
import { POST as waitlistPOST } from "@/app/api/waitlist/route";
import { getExperimentRepository, resetExperimentRepositoryForTests } from "@/libs/db";
import { WAITLIST_CONSENT_VERSION } from "@/libs/experiment/constants";
import type {
  OwnProfileResponse,
  PreviewCompleteResponse,
  PreviewGenerateResponse,
  PricedIntentResponse,
  SegmentResponse,
  SessionResponse,
  WaitlistResponse,
} from "@/types/api";

import { TestCookieJar } from "./test-cookie-jar";

// Sprint 4 — journeys del recorrido comercial (paywall/intencion/
// waitlist). Corre con los drivers mock/memory por defecto: ejercita el
// pipeline real (rutas HTTP -> servicios -> persistencia) sin depender de
// Railway/OpenAI/Supabase reales.

const MADRID_PLACE_ID = 3117735;

interface BuildRequestInit {
  method?: "GET" | "POST";
  body?: string;
}

function buildRequest(path: string, cookies: Record<string, string> = {}, init: BuildRequestInit = {}): NextRequest {
  // Suspension de trafico real (libs/experiment/constants.ts): estos
  // journeys ejercitan paywall/priced-intent/waitlist, no el bloqueo de
  // trafico real (ver tests/integration/suspension.test.ts) -- se
  // marcan por defecto como trafico de test.
  const cookiesWithTestFlag = { vega_test: "1", ...cookies };
  const cookieHeader = Object.entries(cookiesWithTestFlag)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");

  const headers = new Headers();
  if (init.body) headers.set("content-type", "application/json");
  if (cookieHeader) headers.set("cookie", cookieHeader);

  return new NextRequest(new URL(path, "http://localhost:3000"), { method: init.method, body: init.body, headers });
}

function postJson(
  handler: (request: NextRequest) => Promise<Response>,
  path: string,
  body: unknown,
  cookies: Record<string, string> = {}
) {
  return handler(buildRequest(path, cookies, { method: "POST", body: JSON.stringify(body) }));
}

async function startAttempt(segment: "A" | "B") {
  const jar = new TestCookieJar();

  const sessionResponse = await sessionGET(buildRequest("/api/session", jar.asRecord()));
  jar.apply(sessionResponse);
  const auid = jar.get("vega_auid");

  const segmentResponse = await segmentPOST(
    buildRequest("/api/segment", jar.asRecord(), { method: "POST", body: JSON.stringify({ segment }) })
  );
  jar.apply(segmentResponse);
  const segmentBody = (await segmentResponse.json()) as SegmentResponse;

  return { auid, flowAttemptId: segmentBody.flowAttemptId, cookies: jar.asRecord() };
}

async function completeSegmentAOnboardingAndPreview(cookies: Record<string, string>, flowAttemptId: string) {
  await postJson(problemPOST, "/api/problem", { flowAttemptId, trigger: "career", freeText: "Contexto de prueba" }, cookies);
  const ownProfileResponse = await postJson(
    ownProfilePOST,
    "/api/own-profile",
    { flowAttemptId, birthDate: "1990-05-12", birthTimeKnown: true, birthTime: "14:35", placeId: MADRID_PLACE_ID },
    cookies
  );
  const body = (await ownProfileResponse.json()) as OwnProfileResponse;
  expect(body.nextStep).toBe("preview");

  const previewResponse = await postJson(previewPOST, "/api/preview", { flowAttemptId }, cookies);
  const previewBody = (await previewResponse.json()) as PreviewGenerateResponse;
  expect(previewBody.ok && previewBody.status === "valid").toBe(true);
}

describe("Sprint 4 — journeys del recorrido comercial (paywall/intent/waitlist)", () => {
  beforeEach(() => {
    resetExperimentRepositoryForTests();
  });

  it("journey completo A: preview -> preview/complete -> priced-intent -> waitlist", async () => {
    const { flowAttemptId, cookies } = await startAttempt("A");
    await completeSegmentAOnboardingAndPreview(cookies, flowAttemptId);

    const completeResponse = await postJson(previewCompletePOST, "/api/preview/complete", { flowAttemptId }, cookies);
    expect(completeResponse.status).toBe(200);
    expect(((await completeResponse.json()) as PreviewCompleteResponse).ok).toBe(true);

    const intentResponse = await postJson(pricedIntentPOST, "/api/priced-intent", { flowAttemptId }, cookies);
    expect(intentResponse.status).toBe(200);
    const intentBody = (await intentResponse.json()) as PricedIntentResponse;
    expect(intentBody.ok).toBe(true);
    expect(intentBody.wasNew).toBe(true);

    const waitlistResponse = await postJson(
      waitlistPOST,
      "/api/waitlist",
      { flowAttemptId, email: "usuario@example.com", consentVersion: WAITLIST_CONSENT_VERSION },
      cookies
    );
    expect(waitlistResponse.status).toBe(200);
    const waitlistBody = (await waitlistResponse.json()) as WaitlistResponse;
    expect(waitlistBody.ok).toBe(true);
    expect(waitlistBody.wasNew).toBe(true);

    const repository = getExperimentRepository();
    const attempt = await repository.getFlowAttemptById(flowAttemptId);
    expect(attempt?.currentStep).toBe("waitlist");
  });

  it("POST /api/preview/complete sin preview valida devuelve 403", async () => {
    const { flowAttemptId, cookies } = await startAttempt("A");
    await postJson(problemPOST, "/api/problem", { flowAttemptId, trigger: "career" }, cookies);

    const response = await postJson(previewCompletePOST, "/api/preview/complete", { flowAttemptId }, cookies);
    expect(response.status).toBe(403);

    const repository = getExperimentRepository();
    const attempt = await repository.getFlowAttemptById(flowAttemptId);
    expect(attempt?.currentStep).not.toBe("preview");
  });

  it("POST /api/preview/complete con un flowAttemptId inexistente devuelve 404", async () => {
    const response = await postJson(previewCompletePOST, "/api/preview/complete", {
      flowAttemptId: "00000000-0000-4000-8000-000000000000",
    });
    expect(response.status).toBe(404);
  });

  it("POST /api/priced-intent sin preview valida devuelve 403, sin crear priced_access_intents ni avanzar currentStep", async () => {
    const { flowAttemptId, cookies } = await startAttempt("A");
    const response = await postJson(pricedIntentPOST, "/api/priced-intent", { flowAttemptId }, cookies);
    expect(response.status).toBe(403);

    const repository = getExperimentRepository();
    const intent = await repository.getPricedAccessIntentByFlowAttempt(flowAttemptId);
    expect(intent).toBeNull();
    const attempt = await repository.getFlowAttemptById(flowAttemptId);
    expect(attempt?.currentStep).not.toBe("access_intent");
  });

  it("POST /api/priced-intent con un flowAttemptId inexistente devuelve 404", async () => {
    const response = await postJson(pricedIntentPOST, "/api/priced-intent", {
      flowAttemptId: "00000000-0000-4000-8000-000000000000",
    });
    expect(response.status).toBe(404);
  });

  it("POST /api/waitlist con un flowAttemptId inexistente devuelve 404", async () => {
    const response = await postJson(waitlistPOST, "/api/waitlist", {
      flowAttemptId: "00000000-0000-4000-8000-000000000000",
      email: "usuario@example.com",
      consentVersion: WAITLIST_CONSENT_VERSION,
    });
    expect(response.status).toBe(404);
  });

  it("rechaza un flowAttemptId valido que no pertenece a la sesion actual, aunque esa sesion sea completamente legitima (404, guard de pertenencia)", async () => {
    const ownerAttempt = await startAttempt("A");
    await completeSegmentAOnboardingAndPreview(ownerAttempt.cookies, ownerAttempt.flowAttemptId);

    // Sesion B: no es un cliente sin cookies, es un segundo usuario real
    // con su propia identidad ya verificada (su propia vega_session
    // valida) -- justo el caso que el guard de pertenencia de
    // flowAttemptId debe rechazar (libs/experiment/flow-attempt-guard.ts).
    const attackerSession = await startAttempt("A");

    const response = await postJson(
      pricedIntentPOST,
      "/api/priced-intent",
      { flowAttemptId: ownerAttempt.flowAttemptId },
      attackerSession.cookies
    );
    expect(response.status).toBe(404);
  });

  it("reenviar POST /api/priced-intent es idempotente: mismo resultado, wasNew=false la segunda vez", async () => {
    const { flowAttemptId, cookies } = await startAttempt("A");
    await completeSegmentAOnboardingAndPreview(cookies, flowAttemptId);

    const first = await postJson(pricedIntentPOST, "/api/priced-intent", { flowAttemptId }, cookies);
    const firstBody = (await first.json()) as PricedIntentResponse;
    const second = await postJson(pricedIntentPOST, "/api/priced-intent", { flowAttemptId }, cookies);
    const secondBody = (await second.json()) as PricedIntentResponse;

    expect(firstBody.wasNew).toBe(true);
    expect(secondBody.wasNew).toBe(false);

    const repository = getExperimentRepository();
    const count = await repository.getPricedAccessIntentByFlowAttempt(flowAttemptId);
    expect(count).not.toBeNull();
  });

  it("POST /api/waitlist sin priced_access_intents previo devuelve 403, aunque exista preview valida", async () => {
    const { flowAttemptId, cookies } = await startAttempt("A");
    await completeSegmentAOnboardingAndPreview(cookies, flowAttemptId);

    const response = await postJson(
      waitlistPOST,
      "/api/waitlist",
      { flowAttemptId, email: "usuario@example.com", consentVersion: WAITLIST_CONSENT_VERSION },
      cookies
    );
    expect(response.status).toBe(403);
  });

  it("POST /api/waitlist con consentVersion invalida devuelve 400", async () => {
    const { flowAttemptId, cookies } = await startAttempt("A");
    await completeSegmentAOnboardingAndPreview(cookies, flowAttemptId);
    await postJson(pricedIntentPOST, "/api/priced-intent", { flowAttemptId }, cookies);

    const response = await postJson(
      waitlistPOST,
      "/api/waitlist",
      { flowAttemptId, email: "usuario@example.com", consentVersion: "version_antigua" },
      cookies
    );
    expect(response.status).toBe(400);
  });

  it("reenviar POST /api/waitlist con otro email es idempotente: conserva el primer email, wasNew=false", async () => {
    const { flowAttemptId, cookies } = await startAttempt("A");
    await completeSegmentAOnboardingAndPreview(cookies, flowAttemptId);
    await postJson(pricedIntentPOST, "/api/priced-intent", { flowAttemptId }, cookies);

    const first = await postJson(
      waitlistPOST,
      "/api/waitlist",
      { flowAttemptId, email: "primero@example.com", consentVersion: WAITLIST_CONSENT_VERSION },
      cookies
    );
    const firstBody = (await first.json()) as WaitlistResponse;
    const second = await postJson(
      waitlistPOST,
      "/api/waitlist",
      { flowAttemptId, email: "segundo@example.com", consentVersion: WAITLIST_CONSENT_VERSION },
      cookies
    );
    const secondBody = (await second.json()) as WaitlistResponse;

    expect(firstBody.wasNew).toBe(true);
    expect(secondBody.wasNew).toBe(false);

    const repository = getExperimentRepository();
    const entry = await repository.getWaitlistEntryByFlowAttempt(flowAttemptId);
    expect(entry?.email).toBe("primero@example.com");
  });

  it("GET /api/session devuelve waitlistSubmitted=true tras enviar la waitlist (recuperacion tras refresh)", async () => {
    const { flowAttemptId, cookies } = await startAttempt("A");
    await completeSegmentAOnboardingAndPreview(cookies, flowAttemptId);
    await postJson(pricedIntentPOST, "/api/priced-intent", { flowAttemptId }, cookies);
    await postJson(
      waitlistPOST,
      "/api/waitlist",
      { flowAttemptId, email: "usuario@example.com", consentVersion: WAITLIST_CONSENT_VERSION },
      cookies
    );

    const sessionResponse = await sessionGET(buildRequest("/api/session", cookies));
    const sessionBody = (await sessionResponse.json()) as SessionResponse;
    expect(sessionBody.waitlistSubmitted).toBe(true);
    expect(sessionBody.lastCompletedStep).toBe("waitlist");
  });

  it("journey completo B: sinastria valida -> preview/complete -> priced-intent -> waitlist", async () => {
    const { flowAttemptId, cookies } = await startAttempt("B");
    await postJson(problemPOST, "/api/problem", { flowAttemptId, trigger: "distance", freeText: "Contexto B" }, cookies);
    await postJson(
      ownProfilePOST,
      "/api/own-profile",
      { flowAttemptId, birthDate: "1990-05-12", birthTimeKnown: true, birthTime: "14:35", placeId: MADRID_PLACE_ID },
      cookies
    );
    const { POST: partnerPOST } = await import("@/app/api/partner/route");
    await postJson(
      partnerPOST,
      "/api/partner",
      { flowAttemptId, birthDate: "1988-03-02", birthTimeKnown: true, birthTime: "09:15", placeId: 2509954 },
      cookies
    );

    const previewResponse = await postJson(previewPOST, "/api/preview", { flowAttemptId }, cookies);
    const previewBody = (await previewResponse.json()) as PreviewGenerateResponse;
    expect(previewBody.ok && previewBody.status === "valid").toBe(true);

    await postJson(previewCompletePOST, "/api/preview/complete", { flowAttemptId }, cookies);
    const intentResponse = await postJson(pricedIntentPOST, "/api/priced-intent", { flowAttemptId }, cookies);
    expect(((await intentResponse.json()) as PricedIntentResponse).ok).toBe(true);

    const waitlistResponse = await postJson(
      waitlistPOST,
      "/api/waitlist",
      { flowAttemptId, email: "usuario-b@example.com", consentVersion: WAITLIST_CONSENT_VERSION },
      cookies
    );
    expect(((await waitlistResponse.json()) as WaitlistResponse).ok).toBe(true);
  });
});
