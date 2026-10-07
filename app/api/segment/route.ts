import { NextResponse, type NextRequest } from "next/server";

import { getExperimentRepository } from "@/libs/db";
import { parseAcquisitionFromRequest } from "@/libs/experiment/acquisition";
import { EXPERIMENT_ACCEPTING_REAL_TRAFFIC } from "@/libs/experiment/constants";
import {
  ANONYMOUS_USER_ID_COOKIE,
  ANONYMOUS_USER_ID_MAX_AGE_SECONDS,
  FLOW_ATTEMPT_COOKIE,
  FLOW_ATTEMPT_MAX_AGE_SECONDS,
  isTestRequest,
  readAnonymousUserId,
  readFlowAttemptId,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/libs/experiment/cookies";
import { resolveTrustedAnonymousUserId, signSessionCredential } from "@/libs/experiment/session-credential";
import { bootstrapSession, selectSegment } from "@/libs/experiment/session-service";
import { segmentRequestSchema } from "@/libs/validation/segment";
import type { ApiErrorResponse, SegmentResponse } from "@/types/api";

// POST /api/segment
// Crea (o reutiliza, si es un reintento idempotente) el flow_attempt
// para el segmento elegido. La creacion del anonymous_user_id/
// experiment_users se resuelve aqui tambien por si esta ruta se llama
// sin haber pasado antes por GET /api/session.
export async function POST(
  request: NextRequest
): Promise<NextResponse<SegmentResponse | ApiErrorResponse>> {
  let json: unknown = null;
  try {
    json = await request.json();
  } catch {
    json = null;
  }
  const parsed = segmentRequestSchema.safeParse(json);

  if (!parsed.success) {
    const error: ApiErrorResponse = { ok: false, error: "Payload invalido: se espera { segment: 'A' | 'B' }" };
    return NextResponse.json(error, { status: 400 });
  }

  // Suspension de trafico real (libs/experiment/constants.ts): 503 antes
  // de bootstrapSession/selectSegment, para no crear ni identidad ni
  // flow_attempt alguno. El trafico de test sigue funcionando igual.
  if (!EXPERIMENT_ACCEPTING_REAL_TRAFFIC && !isTestRequest(request)) {
    const error: ApiErrorResponse = { ok: false, error: "experimento no disponible temporalmente" };
    return NextResponse.json(error, { status: 503 });
  }

  const repository = getExperimentRepository();
  const existingFlowAttemptId = readFlowAttemptId(request);

  // Mismo guard de identidad que GET /api/session (libs/experiment/
  // session-credential.ts): solo una vega_session valida recupera una
  // identidad existente, vega_auid nunca es una entrada de confianza.
  const trustedAnonymousUserId = resolveTrustedAnonymousUserId(request);

  const bootstrap = await bootstrapSession(repository, {
    anonymousUserId: trustedAnonymousUserId,
    existingFlowAttemptId,
    acquisition: parseAcquisitionFromRequest(request),
    isTest: isTestRequest(request),
  });

  const result = await selectSegment(repository, {
    userId: bootstrap.userId,
    requestedSegment: parsed.data.segment,
    existingFlowAttemptId,
  });

  const body: SegmentResponse = {
    ok: true,
    flowAttemptId: result.flowAttemptId,
    isPrimaryAttempt: result.isPrimaryAttempt,
  };

  const response = NextResponse.json(body);

  // Mismos dos criterios independientes que GET /api/session: vega_auid
  // se resincroniza si no coincide con la identidad ya resuelta,
  // vega_session solo se (re)emite si no habia credencial de confianza
  // previa. Ver el comentario equivalente en app/api/session/route.ts.
  if (readAnonymousUserId(request) !== bootstrap.anonymousUserId) {
    response.cookies.set(ANONYMOUS_USER_ID_COOKIE, bootstrap.anonymousUserId, {
      maxAge: ANONYMOUS_USER_ID_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
    });
  }

  if (bootstrap.isNewAnonymousUser) {
    response.cookies.set(SESSION_COOKIE, signSessionCredential(bootstrap.anonymousUserId), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });
  }

  response.cookies.set(FLOW_ATTEMPT_COOKIE, result.flowAttemptId, {
    maxAge: FLOW_ATTEMPT_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
  });

  return response;
}
