import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET as sessionGET } from "@/app/api/session/route";
import { POST as segmentPOST } from "@/app/api/segment/route";
import { POST as problemPOST } from "@/app/api/problem/route";
import { getExperimentRepository, resetExperimentRepositoryForTests } from "@/libs/db";
import { signSessionCredential } from "@/libs/experiment/session-credential";
import type { ApiErrorResponse, SegmentResponse, SessionResponse } from "@/types/api";

import { TestCookieJar } from "./test-cookie-jar";

// Prueba el ataque exacto que motivo la ultima revision del guard de
// pertenencia de flowAttemptId: un atacante que solo conoce el
// vega_auid de una victima (cookie no httpOnly, filtrable por XSS/logs/
// Referer) nunca debe poder obtener una vega_session valida para la
// identidad de esa victima. La unica credencial que el servidor
// reconoce como "ya existente" es una vega_session verificable
// (libs/experiment/session-credential.ts); vega_auid nunca se lee para
// resolver identidad.

interface BuildRequestInit {
  method?: "GET" | "POST";
  body?: string;
}

function buildRequest(path: string, cookies: Record<string, string> = {}, init: BuildRequestInit = {}): NextRequest {
  // Suspension de trafico real (libs/experiment/constants.ts): este
  // archivo prueba la seguridad de la credencial de sesion, no el
  // bloqueo de trafico real -- se marca por defecto como trafico de
  // test (incluidas las cookies del atacante) para que bootstrapVictim()
  // y las propias llamadas de ataque no reciban 503. isTestRequest() es
  // ortogonal a resolveTrustedAnonymousUserId/verifySessionCredential y
  // al guard de pertenencia: ninguna asercion de este archivo depende
  // del valor de isTest.
  const cookiesWithTestFlag = { vega_test: "1", ...cookies };
  const cookieHeader = Object.entries(cookiesWithTestFlag)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");

  const headers = new Headers();
  if (init.body) headers.set("content-type", "application/json");
  if (cookieHeader) headers.set("cookie", cookieHeader);

  return new NextRequest(new URL(path, "http://localhost:3000"), { method: init.method, body: init.body, headers });
}

async function bootstrapVictim() {
  const jar = new TestCookieJar();
  const sessionResponse = await sessionGET(buildRequest("/api/session", jar.asRecord()));
  jar.apply(sessionResponse);
  const auid = jar.get("vega_auid");

  const segmentResponse = await segmentPOST(
    buildRequest("/api/segment", jar.asRecord(), { method: "POST", body: JSON.stringify({ segment: "A" }) })
  );
  jar.apply(segmentResponse);
  const segmentBody = (await segmentResponse.json()) as SegmentResponse;

  return { auid, flowAttemptId: segmentBody.flowAttemptId, cookies: jar.asRecord() };
}

// Cambia el primer caracter de una cadena base64url por otro valido y
// distinto, preservando la longitud -- mismo helper que
// tests/unit/session-credential.test.ts, para que el rechazo se deba a
// la firma en si, no a una discrepancia de longitud/formato.
function flipFirstChar(value: string): string {
  const first = value.at(0)!;
  const replacement = first === "A" ? "B" : "A";
  return `${replacement}${value.slice(1)}`;
}

async function expectAttackerCookiesDenied(attackerCookies: Record<string, string>, victim: { auid: string; flowAttemptId: string }) {
  const repository = getExperimentRepository();
  const victimUser = await repository.getExperimentUserByAnonymousId(victim.auid);
  expect(await repository.countFlowAttemptsForUser(victimUser!.id)).toBe(1);

  const businessResponse = await problemPOST(
    buildRequest("/api/problem", attackerCookies, {
      method: "POST",
      body: JSON.stringify({ flowAttemptId: victim.flowAttemptId, trigger: "career" }),
    })
  );
  expect(businessResponse.status).toBe(404);
}

describe("guard de pertenencia de flowAttemptId — seguridad de la credencial de sesion", () => {
  beforeEach(() => {
    resetExperimentRepositoryForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("presentar solo el vega_auid de otra persona en GET /api/session no recupera su identidad", async () => {
    const victim = await bootstrapVictim();

    const attackerResponse = await sessionGET(buildRequest("/api/session", { vega_auid: victim.auid }));
    const attackerBody = (await attackerResponse.json()) as SessionResponse;

    expect(attackerBody.anonymousUserId).not.toBe(victim.auid);
    expect(attackerResponse.cookies.get("vega_auid")?.value).not.toBe(victim.auid);

    const repository = getExperimentRepository();
    const victimUser = await repository.getExperimentUserByAnonymousId(victim.auid);
    expect(await repository.countFlowAttemptsForUser(victimUser!.id)).toBe(1);
  });

  it("presentar solo el vega_auid de otra persona en POST /api/segment tampoco recupera su identidad", async () => {
    const victim = await bootstrapVictim();

    const attackerResponse = await segmentPOST(
      buildRequest("/api/segment", { vega_auid: victim.auid }, { method: "POST", body: JSON.stringify({ segment: "A" }) })
    );
    const attackerBody = (await attackerResponse.json()) as SegmentResponse;

    expect(attackerBody.flowAttemptId).not.toBe(victim.flowAttemptId);
    expect(attackerResponse.cookies.get("vega_auid")?.value).not.toBe(victim.auid);

    const repository = getExperimentRepository();
    const victimUser = await repository.getExperimentUserByAnonymousId(victim.auid);
    expect(await repository.countFlowAttemptsForUser(victimUser!.id)).toBe(1);
  });

  it("extremo a extremo: con la sesion minada al presentar solo el vega_auid ajeno, el atacante no puede operar sobre el flowAttemptId de la victima", async () => {
    const victim = await bootstrapVictim();

    const attackerSessionResponse = await sessionGET(buildRequest("/api/session", { vega_auid: victim.auid }));
    const attackerJar = new TestCookieJar();
    attackerJar.apply(attackerSessionResponse);

    const response = await problemPOST(
      buildRequest(
        "/api/problem",
        attackerJar.asRecord(),
        { method: "POST", body: JSON.stringify({ flowAttemptId: victim.flowAttemptId, trigger: "career" }) }
      )
    );
    const body = (await response.json()) as ApiErrorResponse;

    expect(response.status).toBe(404);
    expect(body.ok).toBe(false);
  });

  it("una vega_session manipulada junto al vega_auid de la victima tampoco recupera su identidad ni permite acceder a sus intentos", async () => {
    const victim = await bootstrapVictim();

    // Firma valida para el propio userId de la victima, pero con la
    // firma alterada -- demuestra que ni siquiera partir de una
    // credencial genuina (solo corrompida) sirve para recuperar la
    // identidad: la verificacion es criptografica, no de "forma".
    const validToken = signSessionCredential(victim.auid);
    const [userId, issuedAt, signature] = validToken.split(".") as [string, string, string];
    const tamperedToken = `${userId}.${issuedAt}.${flipFirstChar(signature)}`;

    const attackerCookies = { vega_auid: victim.auid, vega_session: tamperedToken };
    const response = await sessionGET(buildRequest("/api/session", attackerCookies));
    const body = (await response.json()) as SessionResponse;

    expect(body.anonymousUserId).not.toBe(victim.auid);
    expect(response.cookies.get("vega_auid")?.value).not.toBe(victim.auid);

    const attackerJar = new TestCookieJar();
    attackerJar.apply(response);
    await expectAttackerCookiesDenied(attackerJar.asRecord(), victim);
  });

  it("una vega_session caducada (firmada validamente para la victima hace mas de 90 dias) junto a su vega_auid tampoco recupera su identidad ni permite acceder a sus intentos", async () => {
    const victim = await bootstrapVictim();

    const ninetyOneDaysAgo = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 91;
    vi.useFakeTimers();
    vi.setSystemTime(ninetyOneDaysAgo * 1000);
    const expiredToken = signSessionCredential(victim.auid);
    vi.useRealTimers();

    const attackerCookies = { vega_auid: victim.auid, vega_session: expiredToken };
    const response = await sessionGET(buildRequest("/api/session", attackerCookies));
    const body = (await response.json()) as SessionResponse;

    expect(body.anonymousUserId).not.toBe(victim.auid);
    expect(response.cookies.get("vega_auid")?.value).not.toBe(victim.auid);

    const attackerJar = new TestCookieJar();
    attackerJar.apply(response);
    await expectAttackerCookiesDenied(attackerJar.asRecord(), victim);
  });

  it("la victima queda intacta tras el intento de ataque: mismo auid, mismo flowAttemptId, sin filas nuevas asociadas", async () => {
    const victim = await bootstrapVictim();

    await sessionGET(buildRequest("/api/session", { vega_auid: victim.auid }));
    await segmentPOST(
      buildRequest("/api/segment", { vega_auid: victim.auid }, { method: "POST", body: JSON.stringify({ segment: "A" }) })
    );

    const repository = getExperimentRepository();
    const victimUser = await repository.getExperimentUserByAnonymousId(victim.auid);
    expect(victimUser).not.toBeNull();
    expect(await repository.countFlowAttemptsForUser(victimUser!.id)).toBe(1);

    const victimAttempt = await repository.getFlowAttemptById(victim.flowAttemptId);
    expect(victimAttempt?.userId).toBe(victimUser!.id);
  });
});
