import { NextResponse, type NextRequest } from "next/server";

import { getExperimentRepository } from "@/libs/db";
import { requireOwnedFlowAttempt } from "@/libs/experiment/flow-attempt-guard";
import { submitWaitlistEntry } from "@/libs/experiment/waitlist-service";
import { waitlistRequestSchema } from "@/libs/validation/waitlist";
import type { ApiErrorResponse, WaitlistResponse } from "@/types/api";

// POST /api/waitlist
// Exige que ya exista una intencion de pago confirmada
// (priced_access_intents) para el mismo flow_attempt_id -- no basta con
// que exista una preview valida (encargo Sprint 4, ajuste final punto 1).
// Idempotente por flow_attempt_id: un reintento devuelve ok:true con
// wasNew=false sin duplicar la fila. El email nunca llega a PostHog, solo
// se persiste en Supabase.
export async function POST(request: NextRequest): Promise<NextResponse<WaitlistResponse | ApiErrorResponse>> {
  let json: unknown = null;
  try {
    json = await request.json();
  } catch {
    json = null;
  }

  const parsed = waitlistRequestSchema.safeParse(json);
  if (!parsed.success) {
    const error: ApiErrorResponse = { ok: false, error: "Payload invalido para /api/waitlist" };
    return NextResponse.json(error, { status: 400 });
  }

  const repository = getExperimentRepository();
  const guard = await requireOwnedFlowAttempt(repository, request, parsed.data.flowAttemptId);
  if (guard.status === "denied") {
    const error: ApiErrorResponse = { ok: false, error: "flow_attempt no encontrado" };
    return NextResponse.json(error, { status: 404 });
  }

  // Reconstruido en vez de pasar parsed.data directamente: bajo el
  // tsconfig raiz (strict:false / strictNullChecks:false), zod marca
  // erroneamente todos los campos del objeto inferido como opcionales
  // (mismo artefacto de compilacion ya documentado en Sprint 3B para
  // .passthrough()), aunque el schema ya valido en runtime que los tres
  // son obligatorios.
  const outcome = await submitWaitlistEntry(repository, {
    flowAttemptId: parsed.data.flowAttemptId,
    email: parsed.data.email,
    consentVersion: parsed.data.consentVersion,
  });

  if (outcome.status === "not_found") {
    const error: ApiErrorResponse = { ok: false, error: "flow_attempt no encontrado" };
    return NextResponse.json(error, { status: 404 });
  }

  if (outcome.status === "invalid_consent_version") {
    const error: ApiErrorResponse = { ok: false, error: "Version de consentimiento no valida" };
    return NextResponse.json(error, { status: 400 });
  }

  if (outcome.status === "no_priced_access_intent") {
    const error: ApiErrorResponse = {
      ok: false,
      error: "Se requiere una intencion de pago confirmada antes de apuntarse a la waitlist",
    };
    return NextResponse.json(error, { status: 403 });
  }

  const body: WaitlistResponse = { ok: true, wasNew: outcome.wasNew };
  return NextResponse.json(body);
}
