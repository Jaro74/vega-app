import { NextResponse, type NextRequest } from "next/server";

import { getExperimentRepository } from "@/libs/db";
import { requireOwnedFlowAttempt } from "@/libs/experiment/flow-attempt-guard";
import { submitProblem } from "@/libs/experiment/onboarding-service";
import { problemRequestSchema } from "@/libs/validation/problem";
import type { ApiErrorResponse, ProblemResponse } from "@/types/api";

// POST /api/problem
export async function POST(
  request: NextRequest
): Promise<NextResponse<ProblemResponse | ApiErrorResponse>> {
  let json: unknown = null;
  try {
    json = await request.json();
  } catch {
    json = null;
  }

  const parsed = problemRequestSchema.safeParse(json);
  if (!parsed.success) {
    const error: ApiErrorResponse = { ok: false, error: "Payload invalido para /api/problem" };
    return NextResponse.json(error, { status: 400 });
  }

  const repository = getExperimentRepository();
  const guard = await requireOwnedFlowAttempt(repository, request, parsed.data.flowAttemptId);
  if (guard.status === "denied") {
    const error: ApiErrorResponse = { ok: false, error: "flow_attempt no encontrado" };
    return NextResponse.json(error, { status: 404 });
  }

  const result = await submitProblem(repository, parsed.data);
  if (result.ok === false) {
    const error: ApiErrorResponse = { ok: false, error: result.error };
    return NextResponse.json(error, { status: result.status });
  }

  const body: ProblemResponse = { ok: true, nextStep: result.nextStep };
  return NextResponse.json(body);
}
