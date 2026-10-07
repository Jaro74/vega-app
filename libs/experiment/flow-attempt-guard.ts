import type { NextRequest } from "next/server";

import type { ExperimentRepository, FlowAttemptRecord } from "@/libs/db/types";

import { resolveTrustedAnonymousUserId } from "./session-credential";

// Guard centralizado de pertenencia de flowAttemptId a la sesion: las 7
// rutas de negocio (problem, own-profile, partner, preview,
// preview/complete, priced-intent, waitlist) lo llaman antes de invocar
// su propio servicio. "denied" cubre a proposito tanto "no existe" como
// "no es tuyo" -- las rutas siempre lo traducen al mismo 404, para que un
// flowAttemptId ajeno no sirva de oraculo para confirmar que existe.
export type FlowAttemptGuardResult = { status: "ok"; attempt: FlowAttemptRecord } | { status: "denied" };

export async function requireOwnedFlowAttempt(
  repository: ExperimentRepository,
  request: NextRequest,
  flowAttemptId: string
): Promise<FlowAttemptGuardResult> {
  const anonymousUserId = resolveTrustedAnonymousUserId(request);
  if (!anonymousUserId) return { status: "denied" };

  const user = await repository.getExperimentUserByAnonymousId(anonymousUserId);
  if (!user) return { status: "denied" };

  const attempt = await repository.getFlowAttemptById(flowAttemptId);
  if (!attempt || attempt.userId !== user.id) return { status: "denied" };

  return { status: "ok", attempt };
}
