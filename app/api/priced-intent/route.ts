import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";

import { getExperimentRepository } from "@/libs/db";
import { requireOwnedFlowAttempt } from "@/libs/experiment/flow-attempt-guard";
import { createPricedAccessIntentForFlowAttempt } from "@/libs/experiment/priced-intent-service";
import type { ApiErrorResponse, PricedIntentResponse } from "@/types/api";

const pricedIntentRequestSchema = z.object({
  flowAttemptId: z.string().uuid(),
});

// POST /api/priced-intent
// Confirma la intencion de pago (fake door, nunca un cobro real) sobre una
// preview ya valida. Idempotente por flow_attempt_id: un doble clic o un
// reintento tras un fallo de red siempre devuelve ok:true con wasNew=false
// la segunda vez, sin duplicar la fila ni reemitir el evento de analytics.
export async function POST(
  request: NextRequest
): Promise<NextResponse<PricedIntentResponse | ApiErrorResponse>> {
  let json: unknown = null;
  try {
    json = await request.json();
  } catch {
    json = null;
  }

  const parsed = pricedIntentRequestSchema.safeParse(json);
  if (!parsed.success) {
    const error: ApiErrorResponse = { ok: false, error: "Payload invalido para /api/priced-intent" };
    return NextResponse.json(error, { status: 400 });
  }

  const repository = getExperimentRepository();
  const guard = await requireOwnedFlowAttempt(repository, request, parsed.data.flowAttemptId);
  if (guard.status === "denied") {
    const error: ApiErrorResponse = { ok: false, error: "flow_attempt no encontrado" };
    return NextResponse.json(error, { status: 404 });
  }

  const outcome = await createPricedAccessIntentForFlowAttempt(repository, parsed.data.flowAttemptId);

  if (outcome.status === "not_found") {
    const error: ApiErrorResponse = { ok: false, error: "flow_attempt no encontrado" };
    return NextResponse.json(error, { status: 404 });
  }

  if (outcome.status === "no_valid_preview") {
    const error: ApiErrorResponse = { ok: false, error: "No existe una preview valida para este flow_attempt" };
    return NextResponse.json(error, { status: 403 });
  }

  const body: PricedIntentResponse = { ok: true, wasNew: outcome.wasNew };
  return NextResponse.json(body);
}
