import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { GET as sessionGET } from "@/app/api/session/route";
import { POST as segmentPOST } from "@/app/api/segment/route";
import { POST as problemPOST } from "@/app/api/problem/route";
import { POST as ownProfilePOST } from "@/app/api/own-profile/route";
import { POST as partnerPOST } from "@/app/api/partner/route";
import { getExperimentRepository, resetExperimentRepositoryForTests } from "@/libs/db";
import type {
  OwnProfileResponse,
  PartnerResponse,
  ProblemResponse,
  SegmentResponse,
  SessionResponse,
} from "@/types/api";

import { TestCookieJar } from "./test-cookie-jar";

// geonameid real del dataset GeoNames (data/places/cities.json).
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
  // journeys ejercitan el onboarding funcional, no el bloqueo de trafico
  // real (ver tests/integration/suspension.test.ts) -- se marcan por
  // defecto como trafico de test.
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

type OnboardingPath = "/api/problem" | "/api/own-profile" | "/api/partner";

const HANDLERS: Record<OnboardingPath, (request: NextRequest) => Promise<Response>> = {
  "/api/problem": problemPOST,
  "/api/own-profile": ownProfilePOST,
  "/api/partner": partnerPOST,
};

function postJson(path: OnboardingPath, body: unknown, cookies: Record<string, string> = {}) {
  return HANDLERS[path](buildRequest(path, cookies, { method: "POST", body: JSON.stringify(body) }));
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

describe("Sprint 2 — journeys de onboarding completos", () => {
  beforeEach(() => {
    resetExperimentRepositoryForTests();
  });

  it("Journey A full: problem -> own-profile con hora conocida -> onboarding completo", async () => {
    const { flowAttemptId, cookies } = await startAttempt("A");

    const problemResponse = await postJson(
      "/api/problem",
      { flowAttemptId, trigger: "career", freeText: "Contexto de prueba", freeTextConsentGiven: true, freeTextConsentVersion: "v1" },
      cookies
    );
    const problemBody = (await problemResponse.json()) as ProblemResponse;
    expect(problemBody.nextStep).toBe("own_profile_intro");

    const ownProfileResponse = await postJson(
      "/api/own-profile",
      { flowAttemptId, birthDate: "1990-05-12", birthTimeKnown: true, birthTime: "14:35", placeId: MADRID_PLACE_ID },
      cookies
    );
    const ownProfileBody = (await ownProfileResponse.json()) as OwnProfileResponse;
    expect(ownProfileBody.precision).toBe("full");
    expect(ownProfileBody.nextStep).toBe("preview");

    const session = await sessionGET(buildRequest("/api/session", cookies));
    const sessionBody = (await session.json()) as SessionResponse;
    expect(sessionBody.lastCompletedStep).toBe("birth_place");
    expect(sessionBody.birthDateCompleted).toBe(true);
    expect(sessionBody.birthTimeKnown).toBe(true);
  });

  it("Journey A sin hora: precision limited, birthTimeKnown false en la sesion, nunca inventa hora", async () => {
    const { flowAttemptId, cookies } = await startAttempt("A");

    await postJson("/api/problem", { flowAttemptId, trigger: "blocked" }, cookies);
    const ownProfileResponse = await postJson(
      "/api/own-profile",
      { flowAttemptId, birthDate: "1990-05-12", birthTimeKnown: false, placeId: MADRID_PLACE_ID },
      cookies
    );
    const ownProfileBody = (await ownProfileResponse.json()) as OwnProfileResponse;
    expect(ownProfileBody.precision).toBe("limited");

    const session = await sessionGET(buildRequest("/api/session", cookies));
    const sessionBody = (await session.json()) as SessionResponse;
    expect(sessionBody.birthTimeKnown).toBe(false);
  });

  it("Journey B full: problem -> own-profile -> partner full -> onboarding completo", async () => {
    const { flowAttemptId, cookies } = await startAttempt("B");

    await postJson("/api/problem", { flowAttemptId, trigger: "distance" }, cookies);
    const ownProfileResponse = await postJson(
      "/api/own-profile",
      { flowAttemptId, birthDate: "1990-05-12", birthTimeKnown: true, birthTime: "14:35", placeId: MADRID_PLACE_ID },
      cookies
    );
    const ownProfileBody = (await ownProfileResponse.json()) as OwnProfileResponse;
    expect(ownProfileBody.nextStep).toBe("partner");

    const partnerResponse = await postJson(
      "/api/partner",
      { flowAttemptId, birthDate: "1988-03-02", birthTimeKnown: true, birthTime: "09:15", placeId: MADRID_PLACE_ID },
      cookies
    );
    const partnerBody = (await partnerResponse.json()) as PartnerResponse;
    expect(partnerBody.partnerPrecision).toBe("full");
    expect(partnerBody.analysisPossible).toBe(true);

    const session = await sessionGET(buildRequest("/api/session", cookies));
    const sessionBody = (await session.json()) as SessionResponse;
    expect(sessionBody.lastCompletedStep).toBe("partner_data");

    const repository = getExperimentRepository();
    const attempt = await repository.getFlowAttemptById(flowAttemptId);
    expect(attempt?.completedAt).not.toBeNull();
    expect(attempt?.partnerPrecision).toBe("full");
  });

  it("Journey B partial: partner sin hora -> partnerPrecision partial", async () => {
    const { flowAttemptId, cookies } = await startAttempt("B");

    await postJson("/api/problem", { flowAttemptId, trigger: "conflict" }, cookies);
    await postJson(
      "/api/own-profile",
      { flowAttemptId, birthDate: "1990-05-12", birthTimeKnown: false, placeId: MADRID_PLACE_ID },
      cookies
    );
    const partnerResponse = await postJson(
      "/api/partner",
      { flowAttemptId, birthDate: "1988-03-02", birthTimeKnown: false, placeId: MADRID_PLACE_ID },
      cookies
    );
    const partnerBody = (await partnerResponse.json()) as PartnerResponse;
    expect(partnerBody.partnerPrecision).toBe("partial");
  });

  it("Journey B minimal: partner solo con fecha -> partnerPrecision minimal", async () => {
    const { flowAttemptId, cookies } = await startAttempt("B");

    await postJson("/api/problem", { flowAttemptId, trigger: "ex" }, cookies);
    await postJson(
      "/api/own-profile",
      { flowAttemptId, birthDate: "1990-05-12", birthTimeKnown: false, placeId: MADRID_PLACE_ID },
      cookies
    );
    const partnerResponse = await postJson("/api/partner", { flowAttemptId, birthDate: "1988-03-02" }, cookies);
    const partnerBody = (await partnerResponse.json()) as PartnerResponse;
    expect(partnerBody.partnerPrecision).toBe("minimal");
  });

  it("refresh a mitad de flujo conserva el ultimo paso confirmado sin duplicar filas", async () => {
    const { flowAttemptId, cookies } = await startAttempt("A");

    await postJson("/api/problem", { flowAttemptId, trigger: "family" }, cookies);

    // "Refresh": una segunda peticion GET /api/session antes de completar
    // own-profile no debe alterar nada ni duplicar problem_context.
    await sessionGET(buildRequest("/api/session", cookies));
    await sessionGET(buildRequest("/api/session", cookies));

    const repository = getExperimentRepository();
    const attempt = await repository.getFlowAttemptById(flowAttemptId);
    const problemContext = await repository.getProblemContextByFlowAttempt(flowAttemptId);

    expect(attempt?.currentStep).toBe("problem_text");
    expect(problemContext).not.toBeNull();

    const session = await sessionGET(buildRequest("/api/session", cookies));
    const sessionBody = (await session.json()) as SessionResponse;
    expect(sessionBody.lastCompletedStep).toBe("problem_text");
    expect(sessionBody.flowAttemptId).toBe(flowAttemptId);
  });

  it("reenviar /api/problem con el mismo flow_attempt_id es idempotente (no duplica)", async () => {
    const { flowAttemptId, cookies } = await startAttempt("A");

    await postJson("/api/problem", { flowAttemptId, trigger: "career" }, cookies);
    await postJson(
      "/api/problem",
      { flowAttemptId, trigger: "career", freeText: "segundo intento", freeTextConsentGiven: true, freeTextConsentVersion: "v1" },
      cookies
    );

    const repository = getExperimentRepository();
    const problemContext = await repository.getProblemContextByFlowAttempt(flowAttemptId);
    expect(problemContext?.freeText).toBe("segundo intento");
  });

  it("rechaza un trigger de B en un intento de segmento A con 400", async () => {
    const { flowAttemptId, cookies } = await startAttempt("A");

    const response = await postJson("/api/problem", { flowAttemptId, trigger: "breakup" }, cookies);
    expect(response.status).toBe(400);
  });

  it("rechaza /api/partner en un intento de segmento A con 400", async () => {
    const { flowAttemptId, cookies } = await startAttempt("A");

    const response = await postJson("/api/partner", { flowAttemptId, birthDate: "1988-03-02" }, cookies);
    expect(response.status).toBe(400);
  });

  it("cambiar de segmento tras problem_complete crea un nuevo intento secundario, el primero sigue primary", async () => {
    const { flowAttemptId: firstAttemptId, auid, cookies } = await startAttempt("A");
    await postJson("/api/problem", { flowAttemptId: firstAttemptId, trigger: "career" }, cookies);

    const secondSegmentResponse = await segmentPOST(
      buildRequest("/api/segment", cookies, { method: "POST", body: JSON.stringify({ segment: "B" }) })
    );
    const secondSegmentBody = (await secondSegmentResponse.json()) as SegmentResponse;

    expect(secondSegmentBody.flowAttemptId).not.toBe(firstAttemptId);
    expect(secondSegmentBody.isPrimaryAttempt).toBe(false);

    const repository = getExperimentRepository();
    const user = await repository.getExperimentUserByAnonymousId(auid);
    const primary = await repository.getPrimaryFlowAttempt(user!.id);
    expect(primary?.id).toBe(firstAttemptId);

    // El problem_context del primer intento sigue intacto.
    const firstProblemContext = await repository.getProblemContextByFlowAttempt(firstAttemptId);
    expect(firstProblemContext?.trigger).toBe("career");
  });
});
