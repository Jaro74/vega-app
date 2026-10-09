import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { GET as sessionGET } from "@/app/api/session/route";
import { POST as segmentPOST } from "@/app/api/segment/route";
import { POST as problemPOST } from "@/app/api/problem/route";
import { POST as ownProfilePOST } from "@/app/api/own-profile/route";
import { POST as previewPOST } from "@/app/api/preview/route";
import { getExperimentRepository, resetExperimentRepositoryForTests } from "@/libs/db";
import type {
  OwnProfileResponse,
  PreviewGenerateResponse,
  SegmentResponse,
} from "@/types/api";

import { TestCookieJar } from "./test-cookie-jar";

// Estos tests corren con VEGA_CLIENT_DRIVER / OPENAI_PREVIEW_CLIENT_DRIVER
// en su valor por defecto ("mock", ver .env.example): ejercitan el
// pipeline completo (ruta HTTP -> preview-service -> validacion ->
// persistencia) sin depender de Railway ni de OpenAI reales.

const MADRID_PLACE_ID = 3117735;

interface BuildRequestInit {
  method?: "GET" | "POST";
  body?: string;
}

function buildRequest(
  path: string,
  cookies: Record<string, string> = {},
  init: BuildRequestInit = {}
): NextRequest {
  // Suspension de trafico real (libs/experiment/constants.ts): estos
  // journeys ejercitan la generacion de preview, no el bloqueo de
  // trafico real (ver tests/integration/suspension.test.ts) -- se
  // marcan por defecto como trafico de test.
  const cookiesWithTestFlag = { vega_test: "1", ...cookies };
  const cookieHeader = Object.entries(cookiesWithTestFlag)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");

  const headers = new Headers();
  if (init.body) headers.set("content-type", "application/json");
  if (cookieHeader) headers.set("cookie", cookieHeader);

  return new NextRequest(new URL(path, "http://localhost:3000"), {
    method: init.method,
    body: init.body,
    headers,
  });
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

async function completeSegmentAOnboarding(cookies: Record<string, string>, flowAttemptId: string, birthTimeKnown: boolean) {
  await postJson(
    problemPOST,
    "/api/problem",
    { flowAttemptId, trigger: "career", freeText: "Contexto de prueba", freeTextConsentGiven: true, freeTextConsentVersion: "v1" },
    cookies
  );
  const ownProfileResponse = await postJson(
    ownProfilePOST,
    "/api/own-profile",
    {
      flowAttemptId,
      birthDate: "1990-05-12",
      birthTimeKnown,
      birthTime: birthTimeKnown ? "14:35" : undefined,
      placeId: MADRID_PLACE_ID,
    },
    cookies
  );
  const body = (await ownProfileResponse.json()) as OwnProfileResponse;
  expect(body.nextStep).toBe("preview");
}

describe("Sprint 3A — journeys de preview (segmento A)", () => {
  beforeEach(() => {
    resetExperimentRepositoryForTests();
  });

  it("journey A completo hasta preview: onboarding -> POST /api/preview -> preview_v1 valida", async () => {
    const { flowAttemptId, cookies } = await startAttempt("A");
    await completeSegmentAOnboarding(cookies, flowAttemptId, true);

    const previewResponse = await postJson(previewPOST, "/api/preview", { flowAttemptId }, cookies);
    expect(previewResponse.status).toBe(200);
    const previewBody = (await previewResponse.json()) as PreviewGenerateResponse;

    expect(previewBody.ok).toBe(true);
    if (previewBody.ok && previewBody.status === "valid") {
      expect(previewBody.preview.evidence).toHaveLength(2);
    }
  });

  it("journey A sin hora: preview valida y sin referencias a factores dependientes de hora", async () => {
    const { flowAttemptId, cookies } = await startAttempt("A");
    await completeSegmentAOnboarding(cookies, flowAttemptId, false);

    const previewResponse = await postJson(previewPOST, "/api/preview", { flowAttemptId }, cookies);
    const previewBody = (await previewResponse.json()) as PreviewGenerateResponse;

    expect(previewBody.ok).toBe(true);
    if (previewBody.ok && previewBody.status === "valid") {
      const text = `${previewBody.preview.mainInsight} ${previewBody.preview.contextualInterpretation}`.toLowerCase();
      expect(text).not.toContain("ascendente");
      expect(text).not.toMatch(/\bcasas?\b/);
    }
  });

  it("reenviar POST /api/preview para el mismo flow_attempt_id es idempotente (no genera una segunda fila valida)", async () => {
    const { flowAttemptId, cookies } = await startAttempt("A");
    await completeSegmentAOnboarding(cookies, flowAttemptId, true);

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

  // La cobertura de segmento B (sinastria real, insufficient_data,
  // idempotencia, borrado de partner_input) vive en
  // tests/integration/preview-b-journeys.test.ts (Sprint 3B).

  it("flow_attempt inexistente devuelve 404", async () => {
    const response = await postJson(previewPOST, "/api/preview", { flowAttemptId: crypto.randomUUID() });
    expect(response.status).toBe(404);
  });

  it("refresh/recuperacion: consultar GET /api/session tras generar la preview no altera nada", async () => {
    const { flowAttemptId, cookies } = await startAttempt("A");
    await completeSegmentAOnboarding(cookies, flowAttemptId, true);
    await postJson(previewPOST, "/api/preview", { flowAttemptId }, cookies);

    const repository = getExperimentRepository();
    const before = await repository.getValidPreviewByFlowAttempt(flowAttemptId);

    await sessionGET(buildRequest("/api/session", cookies));

    const after = await repository.getValidPreviewByFlowAttempt(flowAttemptId);
    expect(after?.id).toBe(before?.id);
  });
});
