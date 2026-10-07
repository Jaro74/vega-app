import type { ExperimentRepository } from "../db/types";

import { WAITLIST_CONSENT_VERSION } from "./constants";

export interface SubmitWaitlistEntryInput {
  flowAttemptId: string;
  email: string;
  consentVersion: string;
}

export type SubmitWaitlistOutcome =
  | { status: "not_found" }
  | { status: "invalid_consent_version" }
  // Encargo Sprint 4, punto 1 del ajuste final: la waitlist exige una
  // intencion de pago ya confirmada y persistida para el mismo
  // flow_attempt_id. No basta con que exista una preview valida -- el
  // usuario tiene que haber pasado por el paywall y confirmado la segunda
  // pantalla ("Si, quiero acceso...") antes de poder apuntarse.
  | { status: "no_priced_access_intent" }
  | { status: "ok"; wasNew: boolean };

// Idempotente por flow_attempt_id (createWaitlistEntryIfNotExists): un
// reintento siempre devuelve la misma fila con wasNew=false, y el llamador
// (la ruta API) usa ese flag para decidir si el evento de analytics
// waitlist_submit debe dispararse. El email nunca sale de aqui hacia
// PostHog -- solo se persiste en Supabase.
export async function submitWaitlistEntry(
  repository: ExperimentRepository,
  input: SubmitWaitlistEntryInput
): Promise<SubmitWaitlistOutcome> {
  const attempt = await repository.getFlowAttemptById(input.flowAttemptId);
  if (!attempt) return { status: "not_found" };

  // La version de consentimiento la fija el backend, no el cliente: se
  // valida contra la version actual en vez de guardar lo que mande el
  // request, para que consent_version tenga procedencia verificable
  // (encargo Sprint 4, punto 3 del ajuste final).
  if (input.consentVersion !== WAITLIST_CONSENT_VERSION) {
    return { status: "invalid_consent_version" };
  }

  const pricedAccessIntent = await repository.getPricedAccessIntentByFlowAttempt(input.flowAttemptId);
  if (!pricedAccessIntent) return { status: "no_priced_access_intent" };

  const { wasNew } = await repository.createWaitlistEntryIfNotExists({
    flowAttemptId: input.flowAttemptId,
    email: input.email,
    consentVersion: input.consentVersion,
  });

  await repository.updateFlowAttemptProgress({ flowAttemptId: input.flowAttemptId, currentStep: "waitlist" });

  return { status: "ok", wasNew };
}
