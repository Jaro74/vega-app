import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { GET as sessionGET } from "@/app/api/session/route";
import { POST as segmentPOST } from "@/app/api/segment/route";
import { getExperimentRepository, resetExperimentRepositoryForTests } from "@/libs/db";
import type { ApiErrorResponse, SegmentResponse, SessionResponse } from "@/types/api";

import { TestCookieJar } from "./test-cookie-jar";

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
  // journeys ejercitan el comportamiento funcional de sesion/segmento,
  // no el bloqueo de trafico real (ver tests/integration/suspension.test.ts)
  // -- se marcan por defecto como trafico de test. isTestRequest() es
  // ortogonal a la logica de identidad que estos tests verifican.
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

function postSegment(segment: "A" | "B", cookies: Record<string, string> = {}) {
  return segmentPOST(
    buildRequest("/api/segment", cookies, {
      method: "POST",
      body: JSON.stringify({ segment }),
    })
  );
}

// Integra las rutas /api/session y /api/segment tal cual las llamaria el
// navegador, contra el repositorio en memoria (ver libs/db/index.ts:
// sin proyecto Supabase real en este sandbox, ver resumen del sprint).
// Cada test resetea el repositorio para no arrastrar estado entre
// casos. Usa TestCookieJar (test-cookie-jar.ts) para acumular y reenviar
// las cookies de cada respuesta, igual que un navegador real -- en
// particular vega_session, la credencial httpOnly que el guard de
// pertenencia de flowAttemptId exige (libs/experiment/
// session-credential.ts): sin reenviarla, cada llamada posterior minaria
// una identidad nueva en vez de recuperar la existente.
describe("Sprint 1 — journeys de sesion", () => {
  beforeEach(() => {
    resetExperimentRepositoryForTests();
  });

  it("Journey 1: usuario nuevo -> router -> A -> se crea el intento", async () => {
    const jar = new TestCookieJar();

    const sessionResponse = await sessionGET(buildRequest("/api/session", jar.asRecord()));
    jar.apply(sessionResponse);
    const sessionBody = (await sessionResponse.json()) as SessionResponse;
    expect(sessionBody.segment).toBeNull();

    const auid = sessionResponse.cookies.get("vega_auid")?.value;
    expect(auid).toBeTruthy();

    const segmentResponse = await postSegment("A", jar.asRecord());
    jar.apply(segmentResponse);
    const segmentBody = (await segmentResponse.json()) as SegmentResponse;

    expect(segmentBody.ok).toBe(true);
    expect(segmentBody.isPrimaryAttempt).toBe(true);
    expect(segmentResponse.cookies.get("vega_attempt")?.value).toBe(segmentBody.flowAttemptId);
  });

  it("Journey 2 (fundamental): A -> refresh -> sigue en A y conserva el mismo flow_attempt_id", async () => {
    const jar = new TestCookieJar();

    const sessionResponse = await sessionGET(buildRequest("/api/session", jar.asRecord()));
    jar.apply(sessionResponse);

    const segmentResponse = await postSegment("A", jar.asRecord());
    jar.apply(segmentResponse);
    const segmentBody = (await segmentResponse.json()) as SegmentResponse;

    // "Refresh": mismas cookies acumuladas (vega_auid, vega_session,
    // vega_attempt), nueva peticion GET /api/session.
    const refreshResponse = await sessionGET(buildRequest("/api/session", jar.asRecord()));
    jar.apply(refreshResponse);
    const refreshBody = (await refreshResponse.json()) as SessionResponse;

    expect(refreshBody.segment).toBe("A");
    expect(refreshBody.flowAttemptId).toBe(segmentBody.flowAttemptId);
    expect(refreshBody.isPrimaryAttempt).toBe(true);

    // Un segundo refresh no debe crear un segundo intento.
    await sessionGET(buildRequest("/api/session", jar.asRecord()));

    const repository = getExperimentRepository();
    const auid = jar.get("vega_auid");
    const user = await repository.getExperimentUserByAnonymousId(auid);
    expect(await repository.countFlowAttemptsForUser(user!.id)).toBe(1);
  });

  it("Journey 3: cambio de segmento -> A sigue primary, B es secondary, no se sustituye el primario", async () => {
    const jar = new TestCookieJar();

    const sessionResponse = await sessionGET(buildRequest("/api/session", jar.asRecord()));
    jar.apply(sessionResponse);

    const attemptA = await postSegment("A", jar.asRecord());
    jar.apply(attemptA);
    const attemptABody = (await attemptA.json()) as SegmentResponse;

    const attemptB = await postSegment("B", jar.asRecord());
    jar.apply(attemptB);
    const attemptBBody = (await attemptB.json()) as SegmentResponse;

    expect(attemptBBody.flowAttemptId).not.toBe(attemptABody.flowAttemptId);
    expect(attemptABody.isPrimaryAttempt).toBe(true);
    expect(attemptBBody.isPrimaryAttempt).toBe(false);

    const repository = getExperimentRepository();
    const auid = jar.get("vega_auid");
    const user = await repository.getExperimentUserByAnonymousId(auid);
    const primary = await repository.getPrimaryFlowAttempt(user!.id);

    expect(primary?.id).toBe(attemptABody.flowAttemptId);
    expect(primary?.segment).toBe("A");
    expect(await repository.countFlowAttemptsForUser(user!.id)).toBe(2);
  });

  it("Journey 4: usuario existente no duplica experiment_users entre visitas", async () => {
    const jar = new TestCookieJar();

    const firstVisit = await sessionGET(buildRequest("/api/session", jar.asRecord()));
    jar.apply(firstVisit);
    const firstBody = (await firstVisit.json()) as SessionResponse;

    const secondVisit = await sessionGET(buildRequest("/api/session", jar.asRecord()));
    const secondBody = (await secondVisit.json()) as SessionResponse;

    expect(secondBody.anonymousUserId).toBe(firstBody.anonymousUserId);
    // La segunda visita ya reconoce la identidad (via vega_session): no
    // hace falta reparar vega_auid ni reemitir vega_session.
    expect(secondVisit.cookies.get("vega_auid")).toBeUndefined();
    expect(secondVisit.cookies.get("vega_session")).toBeUndefined();
  });

  it("vega_session valida pero vega_auid ausente: se repara vega_auid sin crear un usuario nuevo ni perder el intento", async () => {
    const jar = new TestCookieJar();

    const sessionResponse = await sessionGET(buildRequest("/api/session", jar.asRecord()));
    jar.apply(sessionResponse);
    const originalAuid = jar.get("vega_auid");

    const segmentResponse = await postSegment("A", jar.asRecord());
    jar.apply(segmentResponse);
    const segmentBody = (await segmentResponse.json()) as SegmentResponse;

    // Solo se presenta vega_session (simula que vega_auid se perdio).
    const onlySessionCookie = { vega_session: jar.get("vega_session") };
    const recoveredResponse = await sessionGET(buildRequest("/api/session", onlySessionCookie));
    const recoveredBody = (await recoveredResponse.json()) as SessionResponse;

    expect(recoveredBody.anonymousUserId).toBe(originalAuid);
    expect(recoveredResponse.cookies.get("vega_auid")?.value).toBe(originalAuid);
    // vega_session ya era valida: no hacia falta reemitirla.
    expect(recoveredResponse.cookies.get("vega_session")).toBeUndefined();

    const repository = getExperimentRepository();
    const user = await repository.getExperimentUserByAnonymousId(originalAuid);
    expect(await repository.countFlowAttemptsForUser(user!.id)).toBe(1);
    expect((await repository.getFlowAttemptById(segmentBody.flowAttemptId))?.id).toBe(segmentBody.flowAttemptId);
  });

  it("vega_auid ausente pero vega_session y vega_attempt presentes: recupera identidad e intento activo sin crear otro usuario ni duplicar el intento", async () => {
    const jar = new TestCookieJar();

    const sessionResponse = await sessionGET(buildRequest("/api/session", jar.asRecord()));
    jar.apply(sessionResponse);
    const originalAuid = jar.get("vega_auid");

    const segmentResponse = await postSegment("A", jar.asRecord());
    jar.apply(segmentResponse);
    const segmentBody = (await segmentResponse.json()) as SegmentResponse;

    // Se pierde solo vega_auid: vega_session y vega_attempt se conservan
    // (a diferencia del caso anterior, que tambien omitia vega_attempt).
    const withoutAuidOnly = { vega_session: jar.get("vega_session"), vega_attempt: jar.get("vega_attempt") };
    const recoveredResponse = await sessionGET(buildRequest("/api/session", withoutAuidOnly));
    const recoveredBody = (await recoveredResponse.json()) as SessionResponse;

    // Identidad recuperada via vega_session, no una nueva.
    expect(recoveredBody.anonymousUserId).toBe(originalAuid);
    expect(recoveredResponse.cookies.get("vega_auid")?.value).toBe(originalAuid);

    // Intento activo recuperado (vega_attempt seguia presente y ahora
    // corresponde a la identidad correctamente resuelta).
    expect(recoveredBody.flowAttemptId).toBe(segmentBody.flowAttemptId);
    expect(recoveredBody.segment).toBe("A");
    expect(recoveredBody.isPrimaryAttempt).toBe(true);

    const repository = getExperimentRepository();
    const user = await repository.getExperimentUserByAnonymousId(originalAuid);
    expect(await repository.countFlowAttemptsForUser(user!.id)).toBe(1);
  });

  it("vega_session valida con un vega_auid distinto presentado: se repara al valor correcto, no al ajeno", async () => {
    const jar = new TestCookieJar();
    const sessionResponse = await sessionGET(buildRequest("/api/session", jar.asRecord()));
    jar.apply(sessionResponse);
    const originalAuid = jar.get("vega_auid");

    const mismatchedCookies = { vega_auid: "un-valor-distinto-cualquiera", vega_session: jar.get("vega_session") };
    const response = await sessionGET(buildRequest("/api/session", mismatchedCookies));
    const body = (await response.json()) as SessionResponse;

    expect(body.anonymousUserId).toBe(originalAuid);
    expect(response.cookies.get("vega_auid")?.value).toBe(originalAuid);
  });

  it("reselecionar el mismo segmento del intento activo es idempotente (sin duplicar el intento)", async () => {
    const jar = new TestCookieJar();

    const sessionResponse = await sessionGET(buildRequest("/api/session", jar.asRecord()));
    jar.apply(sessionResponse);

    const first = await postSegment("A", jar.asRecord());
    jar.apply(first);
    const firstBody = (await first.json()) as SegmentResponse;

    const second = await postSegment("A", jar.asRecord());
    const secondBody = (await second.json()) as SegmentResponse;

    expect(secondBody.flowAttemptId).toBe(firstBody.flowAttemptId);

    const repository = getExperimentRepository();
    const auid = jar.get("vega_auid");
    const user = await repository.getExperimentUserByAnonymousId(auid);
    expect(await repository.countFlowAttemptsForUser(user!.id)).toBe(1);
  });

  it("rechaza un segmento invalido con 400", async () => {
    const response = await segmentPOST(
      buildRequest("/api/segment", {}, {
        method: "POST",
        body: JSON.stringify({ segment: "C" }),
      })
    );
    const body = (await response.json()) as ApiErrorResponse;

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
  });
});
