import { NextResponse, type NextRequest } from "next/server";

import { getExperimentRepository } from "@/libs/db";
import { requireOwnedFlowAttempt } from "@/libs/experiment/flow-attempt-guard";
import { submitOwnProfile } from "@/libs/experiment/onboarding-service";
import { ownProfileRequestSchema } from "@/libs/validation/profile";
import type { ApiErrorResponse, OwnProfileResponse } from "@/types/api";

// POST /api/own-profile
export async function POST(
  request: NextRequest
): Promise<NextResponse<OwnProfileResponse | ApiErrorResponse>> {
  let json: unknown = null;
  try {
    json = await request.json();
  } catch {
    json = null;
  }

  const parsed = ownProfileRequestSchema.safeParse(json);
  if (!parsed.success) {
    const error: ApiErrorResponse = { ok: false, error: "Payload invalido para /api/own-profile" };
    return NextResponse.json(error, { status: 400 });
  }

  const repository = getExperimentRepository();
  const guard = await requireOwnedFlowAttempt(repository, request, parsed.data.flowAttemptId);
  if (guard.status === "denied") {
    const error: ApiErrorResponse = { ok: false, error: "flow_attempt no encontrado" };
    return NextResponse.json(error, { status: 404 });
  }

  const result = await submitOwnProfile(repository, parsed.data);
  if (result.ok === false) {
    const error: ApiErrorResponse = { ok: false, error: result.error };
    return NextResponse.json(error, { status: result.status });
  }

  const body: OwnProfileResponse = { ok: true, precision: result.precision, nextStep: result.nextStep };
  return NextResponse.json(body);
}
