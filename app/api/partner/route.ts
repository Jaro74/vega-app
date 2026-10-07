import { NextResponse, type NextRequest } from "next/server";

import { getExperimentRepository } from "@/libs/db";
import { requireOwnedFlowAttempt } from "@/libs/experiment/flow-attempt-guard";
import { submitPartner } from "@/libs/experiment/onboarding-service";
import { partnerRequestSchema } from "@/libs/validation/partner";
import type { ApiErrorResponse, PartnerResponse } from "@/types/api";

// POST /api/partner
export async function POST(
  request: NextRequest
): Promise<NextResponse<PartnerResponse | ApiErrorResponse>> {
  let json: unknown = null;
  try {
    json = await request.json();
  } catch {
    json = null;
  }

  const parsed = partnerRequestSchema.safeParse(json);
  if (!parsed.success) {
    const error: ApiErrorResponse = { ok: false, error: "Payload invalido para /api/partner" };
    return NextResponse.json(error, { status: 400 });
  }

  const repository = getExperimentRepository();
  const guard = await requireOwnedFlowAttempt(repository, request, parsed.data.flowAttemptId);
  if (guard.status === "denied") {
    const error: ApiErrorResponse = { ok: false, error: "flow_attempt no encontrado" };
    return NextResponse.json(error, { status: 404 });
  }

  const result = await submitPartner(repository, parsed.data);
  if (result.ok === false) {
    const error: ApiErrorResponse = { ok: false, error: result.error };
    return NextResponse.json(error, { status: result.status });
  }

  const body: PartnerResponse = {
    ok: true,
    partnerPrecision: result.partnerPrecision,
    analysisPossible: result.analysisPossible,
  };
  return NextResponse.json(body);
}
