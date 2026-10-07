import { NextResponse, type NextRequest } from "next/server";

import { getExperimentRepository } from "@/libs/db";
import {
  ANONYMOUS_USER_ID_COOKIE,
  FLOW_ATTEMPT_COOKIE,
  isTestRequest,
  SESSION_COOKIE,
} from "@/libs/experiment/cookies";
import { EXPERIMENT_ACCEPTING_REAL_TRAFFIC } from "@/libs/experiment/constants";
import { deleteAllOwnData } from "@/libs/experiment/privacy-service";
import { resolveTrustedAnonymousUserId } from "@/libs/experiment/session-credential";
import type { ApiErrorResponse, PrivacyDeleteAllResponse } from "@/types/api";

// POST /api/privacy/delete-all
// Borra, en una sola solicitud autenticada, el nucleo purgable de TODOS
// los flow_attempts del usuario mas la entrada de waitlist si existe, y
// SOLO AL FINAL invalida vega_session/vega_auid/vega_attempt -- nunca
// vega_test, que debe sobrevivir para que el trafico de prueba siga
// funcionando con la identidad nueva que se mine despues. Comprehensiva
// a proposito: evita que el orden de pulsar botones separados pueda
// dejar la waitlist inalcanzable despues de invalidar la sesion. No toca
// experiment_users, flow_attempts (ni current_step/trigger/
// partner_precision/completed_at) ni priced_access_intents.
export async function POST(
  request: NextRequest
): Promise<NextResponse<PrivacyDeleteAllResponse | ApiErrorResponse>> {
  if (!EXPERIMENT_ACCEPTING_REAL_TRAFFIC && !isTestRequest(request)) {
    const error: ApiErrorResponse = { ok: false, error: "experimento no disponible temporalmente" };
    return NextResponse.json(error, { status: 503 });
  }

  const anonymousUserId = resolveTrustedAnonymousUserId(request);
  if (!anonymousUserId) {
    const error: ApiErrorResponse = { ok: false, error: "no hay una sesion activa" };
    return NextResponse.json(error, { status: 401 });
  }

  const repository = getExperimentRepository();
  const user = await repository.getExperimentUserByAnonymousId(anonymousUserId);
  if (!user) {
    const error: ApiErrorResponse = { ok: false, error: "no hay una sesion activa" };
    return NextResponse.json(error, { status: 401 });
  }

  const result = await deleteAllOwnData(repository, user.id);

  const body: PrivacyDeleteAllResponse = { ok: true, ...result };
  const response = NextResponse.json(body);

  // Invalidacion al final, sobre la respuesta ya construida: vega_test
  // no aparece aqui a proposito, no se toca.
  response.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  response.cookies.set(ANONYMOUS_USER_ID_COOKIE, "", { maxAge: 0, path: "/" });
  response.cookies.set(FLOW_ATTEMPT_COOKIE, "", { maxAge: 0, path: "/" });

  return response;
}
