import type { NextRequest } from "next/server";

// Ninguna de estas cookies es secreta (anonymous_user_id, flow_attempt_id
// y el flag de tester no son PII), por eso no son httpOnly: el cliente
// necesita poder leerlas para identify() de PostHog y para futuras
// pantallas. VEGA_Plan_Tecnico, seccion 4.
export const ANONYMOUS_USER_ID_COOKIE = "vega_auid";
export const FLOW_ATTEMPT_COOKIE = "vega_attempt";
export const TEST_TRAFFIC_COOKIE = "vega_test";
// httpOnly a diferencia de las anteriores: es la unica credencial que el
// guard de pertenencia de flowAttemptId acepta (libs/experiment/
// session-credential.ts, libs/experiment/flow-attempt-guard.ts). vega_auid
// sigue existiendo para PostHog pero deja de ser una entrada de confianza
// para el servidor.
export const SESSION_COOKIE = "vega_session";

const NINETY_DAYS_SECONDS = 60 * 60 * 24 * 90;

export const ANONYMOUS_USER_ID_MAX_AGE_SECONDS = NINETY_DAYS_SECONDS;
export const FLOW_ATTEMPT_MAX_AGE_SECONDS = NINETY_DAYS_SECONDS;
export const TEST_TRAFFIC_MAX_AGE_SECONDS = NINETY_DAYS_SECONDS;
export const SESSION_MAX_AGE_SECONDS = NINETY_DAYS_SECONDS;

export function readAnonymousUserId(request: NextRequest): string | null {
  return request.cookies.get(ANONYMOUS_USER_ID_COOKIE)?.value ?? null;
}

export function readFlowAttemptId(request: NextRequest): string | null {
  return request.cookies.get(FLOW_ATTEMPT_COOKIE)?.value ?? null;
}

export function readSessionCredential(request: NextRequest): string | null {
  return request.cookies.get(SESSION_COOKIE)?.value ?? null;
}

export function isTestRequest(request: NextRequest): boolean {
  if (request.cookies.get(TEST_TRAFFIC_COOKIE)?.value === "1") return true;
  return request.nextUrl.searchParams.get("test") === "1";
}
