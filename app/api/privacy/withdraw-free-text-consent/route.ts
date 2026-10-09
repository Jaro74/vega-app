import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";

import { getExperimentRepository } from "@/libs/db";
import { isTestRequest } from "@/libs/experiment/cookies";
import { EXPERIMENT_ACCEPTING_REAL_TRAFFIC } from "@/libs/experiment/constants";
import { requireOwnedFlowAttempt } from "@/libs/experiment/flow-attempt-guard";
import type { ApiErrorResponse, PrivacyWithdrawFreeTextConsentResponse } from "@/types/api";

const withdrawFreeTextConsentRequestSchema = z.object({
  flowAttemptId: z.string().uuid(),
});

// POST /api/privacy/withdraw-free-text-consent
//
// Accion independiente de delete-all/delete-waitlist: retira el
// consentimiento del free_text de un flow_attempt concreto (mismo guard
// de pertenencia que /api/problem, /api/preview, etc. -- a diferencia de
// delete-waitlist, esta accion es por flow_attempt_id, no por sesion,
// porque un usuario puede tener varios intentos con free_text
// independientes). Delega toda la atomicidad en la RPC
// withdraw_free_text_consent (supabase/migrations/20260110000000_free_text_consent.sql):
// esta ruta solo traduce HTTP <-> esa operacion. Idempotente: un outcome
// distinto de "withdrawn" no es un error.
export async function POST(
  request: NextRequest
): Promise<NextResponse<PrivacyWithdrawFreeTextConsentResponse | ApiErrorResponse>> {
  if (!EXPERIMENT_ACCEPTING_REAL_TRAFFIC && !isTestRequest(request)) {
    const error: ApiErrorResponse = { ok: false, error: "experimento no disponible temporalmente" };
    return NextResponse.json(error, { status: 503 });
  }

  let json: unknown = null;
  try {
    json = await request.json();
  } catch {
    json = null;
  }

  const parsed = withdrawFreeTextConsentRequestSchema.safeParse(json);
  if (!parsed.success) {
    const error: ApiErrorResponse = { ok: false, error: "Payload invalido para /api/privacy/withdraw-free-text-consent" };
    return NextResponse.json(error, { status: 400 });
  }

  const repository = getExperimentRepository();
  const guard = await requireOwnedFlowAttempt(repository, request, parsed.data.flowAttemptId);
  if (guard.status === "denied") {
    const error: ApiErrorResponse = { ok: false, error: "flow_attempt no encontrado" };
    return NextResponse.json(error, { status: 404 });
  }

  const result = await repository.withdrawFreeTextConsent(parsed.data.flowAttemptId);

  const body: PrivacyWithdrawFreeTextConsentResponse = {
    ok: true,
    outcome: result.outcome,
    previewsDeleted: result.previewsDeleted,
  };
  return NextResponse.json(body);
}
