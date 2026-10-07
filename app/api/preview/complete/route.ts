import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";

import { getExperimentRepository } from "@/libs/db";
import { requireOwnedFlowAttempt } from "@/libs/experiment/flow-attempt-guard";
import { completePreviewForFlowAttempt } from "@/libs/experiment/preview-completion-service";
import type { ApiErrorResponse, PreviewCompleteResponse } from "@/types/api";

const previewCompleteRequestSchema = z.object({
  flowAttemptId: z.string().uuid(),
});

// POST /api/preview/complete (Sprint 4)
// Checkpoint puro de recuperacion tras refresh: confirma currentStep=
// "preview" cuando el usuario pulsa "Continuar explorando" sobre una
// preview valida. El cliente espera (await) esta llamada antes de navegar
// al paywall; no es fire-and-forget.
export async function POST(
  request: NextRequest
): Promise<NextResponse<PreviewCompleteResponse | ApiErrorResponse>> {
  let json: unknown = null;
  try {
    json = await request.json();
  } catch {
    json = null;
  }

  const parsed = previewCompleteRequestSchema.safeParse(json);
  if (!parsed.success) {
    const error: ApiErrorResponse = { ok: false, error: "Payload invalido para /api/preview/complete" };
    return NextResponse.json(error, { status: 400 });
  }

  const repository = getExperimentRepository();
  const guard = await requireOwnedFlowAttempt(repository, request, parsed.data.flowAttemptId);
  if (guard.status === "denied") {
    const error: ApiErrorResponse = { ok: false, error: "flow_attempt no encontrado" };
    return NextResponse.json(error, { status: 404 });
  }

  const outcome = await completePreviewForFlowAttempt(repository, parsed.data.flowAttemptId);

  if (outcome.status === "not_found") {
    const error: ApiErrorResponse = { ok: false, error: "flow_attempt no encontrado" };
    return NextResponse.json(error, { status: 404 });
  }

  if (outcome.status === "no_valid_preview") {
    const error: ApiErrorResponse = { ok: false, error: "No existe una preview valida para este flow_attempt" };
    return NextResponse.json(error, { status: 403 });
  }

  const body: PreviewCompleteResponse = { ok: true };
  return NextResponse.json(body);
}
