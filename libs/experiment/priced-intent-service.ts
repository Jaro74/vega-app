import type { ExperimentRepository } from "../db/types";

import { PRICED_ACCESS } from "./constants";

export type CreatePricedIntentOutcome =
  | { status: "not_found" }
  | { status: "no_valid_preview" }
  | { status: "ok"; wasNew: boolean };

// Encargo Sprint 4: la intencion de pago (fake door, nunca un cobro real)
// solo puede confirmarse sobre una preview valida ya generada -- ni antes
// (insufficient_data/error/loading) ni sin haber completado el onboarding.
// Idempotente por flow_attempt_id (createPricedAccessIntentIfNotExists):
// un reintento (doble clic ya bloqueado en el cliente, o un fallo de red
// que provoca un segundo POST) siempre devuelve la misma fila con
// wasNew=false, y el llamador (la ruta API) usa ese flag para decidir si
// el evento de analytics priced_access_intent debe dispararse.
export async function createPricedAccessIntentForFlowAttempt(
  repository: ExperimentRepository,
  flowAttemptId: string
): Promise<CreatePricedIntentOutcome> {
  const attempt = await repository.getFlowAttemptById(flowAttemptId);
  if (!attempt) return { status: "not_found" };

  const validPreview = await repository.getValidPreviewByFlowAttempt(flowAttemptId);
  if (!validPreview) return { status: "no_valid_preview" };

  const { wasNew } = await repository.createPricedAccessIntentIfNotExists({
    flowAttemptId,
    priceMinor: PRICED_ACCESS.priceMinor,
    currency: PRICED_ACCESS.currency,
  });

  await repository.updateFlowAttemptProgress({ flowAttemptId, currentStep: "access_intent" });

  return { status: "ok", wasNew };
}
