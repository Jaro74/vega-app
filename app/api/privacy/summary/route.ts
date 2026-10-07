import { NextResponse, type NextRequest } from "next/server";

import { getExperimentRepository } from "@/libs/db";
import { isTestRequest } from "@/libs/experiment/cookies";
import { EXPERIMENT_ACCEPTING_REAL_TRAFFIC } from "@/libs/experiment/constants";
import { buildPrivacySummary } from "@/libs/experiment/privacy-service";
import { resolveTrustedAnonymousUserId } from "@/libs/experiment/session-credential";
import type { ApiErrorResponse, PrivacySummaryResponse } from "@/types/api";

// GET /api/privacy/summary
// "Resumen de datos asociados a la sesion actual" -- ver el comentario
// extenso en types/api.ts (PrivacySummaryResponse): no es, por si solo,
// el cumplimiento del derecho de acceso del RGPD; su suficiencia
// juridica como mecanismo de ejercicio de ese derecho queda pendiente de
// asesoria externa.
export async function GET(
  request: NextRequest
): Promise<NextResponse<PrivacySummaryResponse | ApiErrorResponse>> {
  // Mismo gate de suspension que el resto de rutas del experimento.
  if (!EXPERIMENT_ACCEPTING_REAL_TRAFFIC && !isTestRequest(request)) {
    const error: ApiErrorResponse = { ok: false, error: "experimento no disponible temporalmente" };
    return NextResponse.json(error, { status: 503 });
  }

  // Unica fuente de identidad de confianza: nunca vega_auid, nunca un
  // identificador recibido en el cuerpo de la peticion -- igual que
  // requireOwnedFlowAttempt. Sin credencial valida no hay nada que
  // resumir (401), no hay ningun parametro con el que sondear datos de
  // otra persona.
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

  const summary = await buildPrivacySummary(repository, user);
  return NextResponse.json(summary);
}
