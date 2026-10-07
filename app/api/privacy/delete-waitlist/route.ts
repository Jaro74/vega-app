import { NextResponse, type NextRequest } from "next/server";

import { getExperimentRepository } from "@/libs/db";
import { isTestRequest } from "@/libs/experiment/cookies";
import { EXPERIMENT_ACCEPTING_REAL_TRAFFIC } from "@/libs/experiment/constants";
import { deleteOwnWaitlistEntry } from "@/libs/experiment/privacy-service";
import { resolveTrustedAnonymousUserId } from "@/libs/experiment/session-credential";
import type { ApiErrorResponse, PrivacyDeleteWaitlistResponse } from "@/types/api";

// POST /api/privacy/delete-waitlist
// Accion independiente de /api/privacy/delete-all: borra UNICAMENTE la
// entrada de waitlist del usuario. No invalida ninguna cookie ni afecta
// al resto del flujo -- para quien quiera salir de la lista de espera
// sin perder su sesion ni el resto de sus datos. Idempotente:
// deleted=false si no habia ninguna entrada no es un error.
export async function POST(
  request: NextRequest
): Promise<NextResponse<PrivacyDeleteWaitlistResponse | ApiErrorResponse>> {
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

  const { deleted } = await deleteOwnWaitlistEntry(repository, user.id);

  const body: PrivacyDeleteWaitlistResponse = { ok: true, deleted };
  return NextResponse.json(body);
}
