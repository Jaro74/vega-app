import { NextResponse, type NextRequest } from "next/server";

import { getExperimentRepository } from "@/libs/db";
import { parseAcquisitionFromRequest } from "@/libs/experiment/acquisition";
import { EXPERIMENT_ACCEPTING_REAL_TRAFFIC } from "@/libs/experiment/constants";
import {
  ANONYMOUS_USER_ID_COOKIE,
  ANONYMOUS_USER_ID_MAX_AGE_SECONDS,
  isTestRequest,
  readAnonymousUserId,
  readFlowAttemptId,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/libs/experiment/cookies";
import { getResumeState } from "@/libs/experiment/onboarding-service";
import { resolveTrustedAnonymousUserId, signSessionCredential } from "@/libs/experiment/session-credential";
import { bootstrapSession } from "@/libs/experiment/session-service";
import type { ApiErrorResponse, SessionResponse } from "@/types/api";

// GET /api/session
// Crea o recupera el anonymous_user_id y devuelve el estado del intento
// activo (si existe), para que el frontend pueda recuperar el estado
// tras un refresh sin volver a mostrar el router. Nunca devuelve datos
// personales: solo el id anonimo, flags y la adquisicion ya persistida.
export async function GET(
  request: NextRequest
): Promise<NextResponse<SessionResponse | ApiErrorResponse>> {
  // Suspension de trafico real (libs/experiment/constants.ts): 503 antes
  // de resolver/crear ninguna identidad ni tocar experiment_users. El
  // trafico de test (?test=1/vega_test) sigue funcionando igual que hoy.
  if (!EXPERIMENT_ACCEPTING_REAL_TRAFFIC && !isTestRequest(request)) {
    const error: ApiErrorResponse = { ok: false, error: "experimento no disponible temporalmente" };
    return NextResponse.json(error, { status: 503 });
  }

  const repository = getExperimentRepository();

  // Guard de pertenencia de flowAttemptId: la unica identidad que este
  // endpoint reconoce como "ya existente" es la que verifica una
  // vega_session valida -- nunca vega_auid, que no es httpOnly y por
  // tanto no es una entrada de confianza (libs/experiment/
  // session-credential.ts). Si no hay credencial valida, se pasa null y
  // bootstrapSession mina una identidad nueva, exactamente como hoy.
  const trustedAnonymousUserId = resolveTrustedAnonymousUserId(request);

  const result = await bootstrapSession(repository, {
    anonymousUserId: trustedAnonymousUserId,
    existingFlowAttemptId: readFlowAttemptId(request),
    acquisition: parseAcquisitionFromRequest(request),
    isTest: isTestRequest(request),
  });

  const resumeState = await getResumeState(repository, result.userId, result.activeAttempt);

  const body: SessionResponse = {
    anonymousUserId: result.anonymousUserId,
    isTest: result.isTest,
    segment: result.activeAttempt?.segment ?? null,
    flowAttemptId: result.activeAttempt?.id ?? null,
    isPrimaryAttempt: result.activeAttempt?.isPrimaryAttempt ?? null,
    lastCompletedStep: resumeState.lastCompletedStep,
    birthDateCompleted: resumeState.birthDateCompleted,
    birthTimeKnown: resumeState.birthTimeKnown,
    partnerPrecision: result.activeAttempt?.partnerPrecision ?? null,
    waitlistSubmitted: resumeState.waitlistSubmitted,
    acquisition: result.acquisition,
  };

  const response = NextResponse.json(body);

  // vega_auid es un espejo de solo lectura para el cliente (PostHog) de
  // la identidad YA resuelta arriba -- nunca la fuente de esa
  // resolucion. Se resincroniza cada vez que no coincide con la
  // identidad verificada, sea esta nueva o recuperada -- por eso NO se
  // usa result.isNewAnonymousUser como unico criterio: eso dejaria sin
  // reparar el caso "vega_session valida, vega_auid perdido/desincronizado".
  if (readAnonymousUserId(request) !== result.anonymousUserId) {
    response.cookies.set(ANONYMOUS_USER_ID_COOKIE, result.anonymousUserId, {
      maxAge: ANONYMOUS_USER_ID_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
    });
  }

  // vega_session solo se (re)emite cuando no habia una credencial de
  // confianza previa -- si ya era valida, sigue siendo exactamente
  // correcta.
  if (result.isNewAnonymousUser) {
    response.cookies.set(SESSION_COOKIE, signSessionCredential(result.anonymousUserId), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });
  }

  return response;
}
