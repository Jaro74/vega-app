import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";

import { getExperimentRepository } from "@/libs/db";
import { requireOwnedFlowAttempt } from "@/libs/experiment/flow-attempt-guard";
import { generatePreviewForFlowAttempt } from "@/libs/experiment/preview-service";
import { getPreviewModelClient } from "@/libs/openai";
import { getVegaEvidenceClient, getVegaSynastryClient } from "@/libs/vega";
import type { ApiErrorResponse, PreviewGenerateResponse } from "@/types/api";

const previewGenerateRequestSchema = z.object({
  flowAttemptId: z.string().uuid(),
});

// POST /api/preview
// Dispara (o recupera, si ya existe una valida) la generacion de la
// preview_v1: segmento A via Vega /evidence/natal, segmento B (Sprint 3B)
// via Vega /evidence/synastry -> allowed_evidence -> OpenAI Structured
// Output -> validacion -> persistencia. Segmento B puede devolver
// "insufficient_data" (HTTP 200, resultado de dominio, no un error) si
// Vega no puede construir una sinastria fiable.
export async function POST(
  request: NextRequest
): Promise<NextResponse<PreviewGenerateResponse | ApiErrorResponse>> {
  let json: unknown = null;
  try {
    json = await request.json();
  } catch {
    json = null;
  }

  const parsed = previewGenerateRequestSchema.safeParse(json);
  if (!parsed.success) {
    const error: ApiErrorResponse = { ok: false, error: "Payload invalido para /api/preview" };
    return NextResponse.json(error, { status: 400 });
  }

  const repository = getExperimentRepository();
  const guard = await requireOwnedFlowAttempt(repository, request, parsed.data.flowAttemptId);
  if (guard.status === "denied") {
    const error: ApiErrorResponse = { ok: false, error: "flow_attempt no encontrado" };
    return NextResponse.json(error, { status: 404 });
  }

  const outcome = await generatePreviewForFlowAttempt(
    repository,
    getVegaEvidenceClient(),
    getPreviewModelClient(),
    getVegaSynastryClient(),
    parsed.data.flowAttemptId
  );

  if (outcome.status === "not_found") {
    const error: ApiErrorResponse = { ok: false, error: "flow_attempt no encontrado" };
    return NextResponse.json(error, { status: 404 });
  }

  if (outcome.status === "insufficient_data") {
    const body: PreviewGenerateResponse = {
      ok: true,
      status: "insufficient_data",
      reason: outcome.reason,
      insufficientParticipants: outcome.insufficientParticipants,
    };
    return NextResponse.json(body);
  }

  if (outcome.status === "error") {
    const body: PreviewGenerateResponse = { ok: false, status: "error", errorType: outcome.errorType };
    return NextResponse.json(body, { status: 422 });
  }

  const body: PreviewGenerateResponse = {
    ok: true,
    status: "valid",
    previewId: outcome.previewId,
    preview: outcome.preview,
  };
  return NextResponse.json(body);
}
