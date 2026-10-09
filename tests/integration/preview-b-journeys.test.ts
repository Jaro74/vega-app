import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { GET as sessionGET } from "@/app/api/session/route";
import { POST as segmentPOST } from "@/app/api/segment/route";
import { POST as problemPOST } from "@/app/api/problem/route";
import { POST as ownProfilePOST } from "@/app/api/own-profile/route";
import { POST as partnerPOST } from "@/app/api/partner/route";
import { POST as previewPOST } from "@/app/api/preview/route";
import { getExperimentRepository, resetExperimentRepositoryForTests } from "@/libs/db";
import type { PreviewGenerateResponse, SegmentResponse, SessionResponse } from "@/types/api";

import { TestCookieJar } from "./test-cookie-jar";

// Journeys de Sprint 3B (sinastria real, segmento B). Corre con los
// drivers mock por defecto (VEGA_CLIENT_DRIVER / OPENAI_PREVIEW_CLIENT_DRIVER
// = mock): ejercita el pipeline completo (ruta HTTP -> synastry-preview-
// service -> validacion -> persistencia) sin depender de Railway ni de
// OpenAI reales.

const MADRID_PLACE_ID = 3117735;
const VALENCIA_PLACE_ID = 2509954;

interface BuildRequestInit {
  method?: "GET" | "POST";
  body?: string;
}

function buildRequest(path: string, cookies: Record<string, string> = {}, init: BuildRequestInit = {}): NextRequest {
  // Suspension de trafico real (libs/experiment/constants.ts): estos
  // journeys ejercitan la generacion de preview (sinastria), no el
  // bloqueo de trafico real (ver tests/integration/suspension.test.ts)
  // -- se marcan por defecto como trafico de test.
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

async function completeSegmentBOwnProfile(cookies: Record<string, string>, flowAttemptId: string) {
  await postJson(
    problemPOST,
    "/api/problem",
    { flowAttemptId, trigger: "distance", freeText: "Un contexto de prueba", freeTextConsentGiven: true, freeTextConsentVersion: "v1" },
    cookies
  );
  await postJson(
    ownProfilePOST,
    "/api/own-profile",
    { flowAttemptId, birthDate: "1990-05-12", birthTimeKnown: true, birthTime: "14:35", placeId: MADRID_PLACE_ID },
    cookies
  );
}

describe("Sprint 3B — journeys de preview (segmento B, sinastria)", () => {
  beforeEach(() => {
    resetExperimentRepositoryForTests();
  });

  it("B full: onboarding -> POST /api/preview -> preview_v1 valida", async () => {
    const { flowAttemptId, cookies } = await startAttempt("B");
    await completeSegmentBOwnProfile(cookies, flowAttemptId);
    await postJson(
      partnerPOST,
      "/api/partner",
      { flowAttemptId, birthDate: "1988-03-02", birthTimeKnown: true, birthTime: "09:15", placeId: VALENCIA_PLACE_ID },
      cookies
    );

    const previewResponse = await postJson(previewPOST, "/api/preview", { flowAttemptId }, cookies);
    expect(previewResponse.status).toBe(200);
    const previewBody = (await previewResponse.json()) as PreviewGenerateResponse;

    expect(previewBody.ok).toBe(true);
    if (previewBody.ok && previewBody.status === "valid") {
      expect(previewBody.preview.evidence).toHaveLength(2);
    }

    const repository = getExperimentRepository();
    expect(await repository.getPartnerInputByFlowAttempt(flowAttemptId)).toBeNull();
  });

  it("B partial: partner sin hora -> preview_v1 valida", async () => {
    const { flowAttemptId, cookies } = await startAttempt("B");
    await completeSegmentBOwnProfile(cookies, flowAttemptId);
    await postJson(
      partnerPOST,
      "/api/partner",
      { flowAttemptId, birthDate: "1988-03-02", birthTimeKnown: false, placeId: VALENCIA_PLACE_ID },
      cookies
    );

    const previewResponse = await postJson(previewPOST, "/api/preview", { flowAttemptId }, cookies);
    const previewBody = (await previewResponse.json()) as PreviewGenerateResponse;

    expect(previewBody.ok).toBe(true);
    if (previewBody.ok) expect(previewBody.status).toBe("valid");
  });

  it("B minimal (sin lugar): POST /api/preview devuelve 200 insufficient_data, nunca improvisa una preview", async () => {
    const { flowAttemptId, cookies } = await startAttempt("B");
    await completeSegmentBOwnProfile(cookies, flowAttemptId);
    await postJson(partnerPOST, "/api/partner", { flowAttemptId, birthDate: "1988-03-02" }, cookies);

    const previewResponse = await postJson(previewPOST, "/api/preview", { flowAttemptId }, cookies);
    expect(previewResponse.status).toBe(200);
    const previewBody = (await previewResponse.json()) as PreviewGenerateResponse;

    expect(previewBody.ok).toBe(true);
    if (previewBody.ok) {
      expect(previewBody.status).toBe("insufficient_data");
      if (previewBody.status === "insufficient_data") {
        expect(previewBody.reason).toBe("participant_minimal");
        expect(previewBody.insufficientParticipants).toEqual(["b"]);
      }
    }
  });

  it("reenviar POST /api/preview para el mismo flow_attempt_id (B full) es idempotente", async () => {
    const { flowAttemptId, cookies } = await startAttempt("B");
    await completeSegmentBOwnProfile(cookies, flowAttemptId);
    await postJson(
      partnerPOST,
      "/api/partner",
      { flowAttemptId, birthDate: "1988-03-02", birthTimeKnown: true, birthTime: "09:15", placeId: VALENCIA_PLACE_ID },
      cookies
    );

    const first = await postJson(previewPOST, "/api/preview", { flowAttemptId }, cookies);
    const firstBody = (await first.json()) as PreviewGenerateResponse;
    const second = await postJson(previewPOST, "/api/preview", { flowAttemptId }, cookies);
    const secondBody = (await second.json()) as PreviewGenerateResponse;

    expect(firstBody.ok && firstBody.status === "valid").toBe(true);
    expect(secondBody.ok && secondBody.status === "valid").toBe(true);
    if (firstBody.ok && firstBody.status === "valid" && secondBody.ok && secondBody.status === "valid") {
      expect(secondBody.previewId).toBe(firstBody.previewId);
    }
  });

  it("tras insufficient_data, reenviar /api/partner con lugar nuevo permite una nueva derivacion valida", async () => {
    const { flowAttemptId, cookies } = await startAttempt("B");
    await completeSegmentBOwnProfile(cookies, flowAttemptId);
    await postJson(partnerPOST, "/api/partner", { flowAttemptId, birthDate: "1988-03-02" }, cookies);

    const firstPreview = await postJson(previewPOST, "/api/preview", { flowAttemptId }, cookies);
    const firstBody = (await firstPreview.json()) as PreviewGenerateResponse;
    expect(firstBody.ok && firstBody.status === "insufficient_data").toBe(true);

    await postJson(
      partnerPOST,
      "/api/partner",
      { flowAttemptId, birthDate: "1988-03-02", birthTimeKnown: false, placeId: VALENCIA_PLACE_ID },
      cookies
    );

    const secondPreview = await postJson(previewPOST, "/api/preview", { flowAttemptId }, cookies);
    const secondBody = (await secondPreview.json()) as PreviewGenerateResponse;
    expect(secondBody.ok && secondBody.status === "valid").toBe(true);
  });

  it("GET /api/session devuelve partnerPrecision tras enviar los datos de la otra persona", async () => {
    const { flowAttemptId, cookies } = await startAttempt("B");
    await completeSegmentBOwnProfile(cookies, flowAttemptId);
    await postJson(
      partnerPOST,
      "/api/partner",
      { flowAttemptId, birthDate: "1988-03-02", birthTimeKnown: true, birthTime: "09:15", placeId: VALENCIA_PLACE_ID },
      cookies
    );

    const sessionResponse = await sessionGET(buildRequest("/api/session", cookies));
    const sessionBody = (await sessionResponse.json()) as SessionResponse;
    expect(sessionBody.partnerPrecision).toBe("full");
  });
});
