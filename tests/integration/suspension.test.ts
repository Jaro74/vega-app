import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { GET as sessionGET } from "@/app/api/session/route";
import { POST as segmentPOST } from "@/app/api/segment/route";
import { resetExperimentRepositoryForTests } from "@/libs/db";
import { EXPERIMENT_ACCEPTING_REAL_TRAFFIC } from "@/libs/experiment/constants";
import type { ApiErrorResponse, SegmentResponse, SessionResponse } from "@/types/api";

// Cobertura dedicada de la suspension de trafico real (libs/experiment/
// constants.ts). A diferencia del resto de tests/integration/*, este
// archivo SI necesita construir peticiones sin marcar como trafico de
// test -- es exactamente lo que verifica -- asi que buildRequest() no
// inyecta ninguna cookie por defecto.

interface BuildRequestInit {
  method?: "GET" | "POST";
  body?: string;
}

function buildRequest(
  path: string,
  cookies: Record<string, string> = {},
  init: BuildRequestInit = {}
): NextRequest {
  const cookieHeader = Object.entries(cookies)
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

describe("suspension de trafico real", () => {
  beforeEach(() => {
    resetExperimentRepositoryForTests();
  });

  it("el flag esta activado (suspension en curso) -- si esto falla, el resto de este archivo no prueba nada util", () => {
    expect(EXPERIMENT_ACCEPTING_REAL_TRAFFIC).toBe(false);
  });

  it("GET /api/session sin ?test=1 ni vega_test devuelve 503 y no fija ninguna cookie de identidad", async () => {
    const response = await sessionGET(buildRequest("/api/session"));
    const body = (await response.json()) as ApiErrorResponse;

    expect(response.status).toBe(503);
    expect(body.ok).toBe(false);
    expect(response.cookies.get("vega_auid")).toBeUndefined();
    expect(response.cookies.get("vega_session")).toBeUndefined();
  });

  it("POST /api/segment sin ?test=1 ni vega_test devuelve 503 y no fija ninguna cookie", async () => {
    const response = await segmentPOST(
      buildRequest("/api/segment", {}, { method: "POST", body: JSON.stringify({ segment: "A" }) })
    );
    const body = (await response.json()) as ApiErrorResponse;

    expect(response.status).toBe(503);
    expect(body.ok).toBe(false);
    expect(response.cookies.get("vega_auid")).toBeUndefined();
    expect(response.cookies.get("vega_attempt")).toBeUndefined();
  });

  it("GET /api/session con cookie vega_test=1 sigue funcionando con normalidad durante la suspension", async () => {
    const response = await sessionGET(buildRequest("/api/session", { vega_test: "1" }));
    const body = (await response.json()) as SessionResponse;

    expect(response.status).toBe(200);
    expect(body.isTest).toBe(true);
    expect(response.cookies.get("vega_auid")?.value).toBeTruthy();
  });

  it("GET /api/session con ?test=1 (sin cookie previa) sigue funcionando con normalidad durante la suspension", async () => {
    const response = await sessionGET(buildRequest("/api/session?test=1"));
    const body = (await response.json()) as SessionResponse;

    expect(response.status).toBe(200);
    expect(body.isTest).toBe(true);
  });

  it("POST /api/segment con ?test=1 sigue creando el flow_attempt con normalidad durante la suspension", async () => {
    const response = await segmentPOST(
      buildRequest("/api/segment?test=1", {}, { method: "POST", body: JSON.stringify({ segment: "A" }) })
    );
    const body = (await response.json()) as SegmentResponse;

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.flowAttemptId).toBeTruthy();
  });
});
