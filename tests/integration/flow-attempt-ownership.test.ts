import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { GET as sessionGET } from "@/app/api/session/route";
import { POST as segmentPOST } from "@/app/api/segment/route";
import { POST as problemPOST } from "@/app/api/problem/route";
import { POST as ownProfilePOST } from "@/app/api/own-profile/route";
import { POST as partnerPOST } from "@/app/api/partner/route";
import { POST as previewPOST } from "@/app/api/preview/route";
import { POST as previewCompletePOST } from "@/app/api/preview/complete/route";
import { POST as pricedIntentPOST } from "@/app/api/priced-intent/route";
import { POST as waitlistPOST } from "@/app/api/waitlist/route";
import { resetExperimentRepositoryForTests } from "@/libs/db";
import { WAITLIST_CONSENT_VERSION } from "@/libs/experiment/constants";
import type { SegmentResponse } from "@/types/api";

import { TestCookieJar } from "./test-cookie-jar";

// Guard de pertenencia de flowAttemptId (libs/experiment/
// flow-attempt-guard.ts): las 7 rutas de negocio deben rechazar con 404
// unificado cualquier peticion cuyo flowAttemptId no pertenezca a la
// sesion que la hace, ya sea porque esa sesion es de otro usuario
// (aunque sea una sesion completamente legitima, con su propia
// vega_session valida) o porque no hay ninguna credencial en absoluto.
// El cuerpo de cada peticion es sintacticamente valido a proposito
// (pasa el zod de cada ruta) para que el 404 se deba unicamente al
// guard, nunca a un 400 de validacion.

const MADRID_PLACE_ID = 3117735;

interface BuildRequestInit {
  method?: "GET" | "POST";
  body?: string;
}

function buildRequest(path: string, cookies: Record<string, string> = {}, init: BuildRequestInit = {}): NextRequest {
  // Suspension de trafico real (libs/experiment/constants.ts): estos
  // tests verifican el guard de pertenencia de flowAttemptId sobre las 7
  // rutas de negocio, ninguna de ellas gated por la suspension -- se
  // marcan por defecto como trafico de test unicamente para que
  // startAttempt() (via /api/session y /api/segment) pueda crear el
  // flowAttemptId de partida sin recibir 503. isTestRequest() no
  // participa en la logica de ownership que este archivo comprueba.
  const cookiesWithTestFlag = { vega_test: "1", ...cookies };
  const cookieHeader = Object.entries(cookiesWithTestFlag)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");

  const headers = new Headers();
  if (init.body) headers.set("content-type", "application/json");
  if (cookieHeader) headers.set("cookie", cookieHeader);

  return new NextRequest(new URL(path, "http://localhost:3000"), { method: init.method, body: init.body, headers });
}

async function startAttempt(segment: "A" | "B") {
  const jar = new TestCookieJar();

  const sessionResponse = await sessionGET(buildRequest("/api/session", jar.asRecord()));
  jar.apply(sessionResponse);

  const segmentResponse = await segmentPOST(
    buildRequest("/api/segment", jar.asRecord(), { method: "POST", body: JSON.stringify({ segment }) })
  );
  jar.apply(segmentResponse);
  const segmentBody = (await segmentResponse.json()) as SegmentResponse;

  return {
    flowAttemptId: segmentBody.flowAttemptId,
    cookies: jar.asRecord(),
    auid: jar.get("vega_auid"),
    attemptCookie: jar.get("vega_attempt"),
  };
}

interface RouteCase {
  name: string;
  handler: (request: NextRequest) => Promise<Response>;
  path: string;
  body: (flowAttemptId: string) => unknown;
}

const ROUTE_CASES: RouteCase[] = [
  {
    name: "POST /api/problem",
    handler: problemPOST,
    path: "/api/problem",
    body: (flowAttemptId) => ({ flowAttemptId, trigger: "career" }),
  },
  {
    name: "POST /api/own-profile",
    handler: ownProfilePOST,
    path: "/api/own-profile",
    body: (flowAttemptId) => ({
      flowAttemptId,
      birthDate: "1990-05-12",
      birthTimeKnown: true,
      birthTime: "14:35",
      placeId: MADRID_PLACE_ID,
    }),
  },
  {
    name: "POST /api/partner",
    handler: partnerPOST,
    path: "/api/partner",
    body: (flowAttemptId) => ({
      flowAttemptId,
      birthDate: "1988-03-02",
      birthTimeKnown: true,
      birthTime: "09:15",
      placeId: MADRID_PLACE_ID,
    }),
  },
  {
    name: "POST /api/preview",
    handler: previewPOST,
    path: "/api/preview",
    body: (flowAttemptId) => ({ flowAttemptId }),
  },
  {
    name: "POST /api/preview/complete",
    handler: previewCompletePOST,
    path: "/api/preview/complete",
    body: (flowAttemptId) => ({ flowAttemptId }),
  },
  {
    name: "POST /api/priced-intent",
    handler: pricedIntentPOST,
    path: "/api/priced-intent",
    body: (flowAttemptId) => ({ flowAttemptId }),
  },
  {
    name: "POST /api/waitlist",
    handler: waitlistPOST,
    path: "/api/waitlist",
    body: (flowAttemptId) => ({
      flowAttemptId,
      email: "usuario@example.com",
      consentVersion: WAITLIST_CONSENT_VERSION,
    }),
  },
];

describe("guard de pertenencia de flowAttemptId — las 7 rutas de negocio", () => {
  let ownerFlowAttemptId: string;

  beforeEach(async () => {
    resetExperimentRepositoryForTests();
    ownerFlowAttemptId = (await startAttempt("A")).flowAttemptId;
  });

  describe.each(ROUTE_CASES)("$name", ({ handler, path, body }) => {
    it("rechaza con 404 el flowAttemptId de otra sesion, aunque esa sesion sea legitima", async () => {
      const otherSession = await startAttempt("A");
      const response = await handler(
        buildRequest(path, otherSession.cookies, { method: "POST", body: JSON.stringify(body(ownerFlowAttemptId)) })
      );
      expect(response.status).toBe(404);
    });

    it("rechaza con 404 sin ninguna cookie", async () => {
      const response = await handler(
        buildRequest(path, {}, { method: "POST", body: JSON.stringify(body(ownerFlowAttemptId)) })
      );
      expect(response.status).toBe(404);
    });

    it("rechaza con 404 con vega_auid/vega_attempt pero sin vega_session (vega_auid nunca autoriza por si solo)", async () => {
      const otherSession = await startAttempt("A");
      const cookiesWithoutSession = { vega_auid: otherSession.auid, vega_attempt: otherSession.attemptCookie };
      const response = await handler(
        buildRequest(path, cookiesWithoutSession, { method: "POST", body: JSON.stringify(body(ownerFlowAttemptId)) })
      );
      expect(response.status).toBe(404);
    });
  });
});
