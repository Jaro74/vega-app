import type { ExperimentRepository } from "../db/types";

export type CompletePreviewOutcome =
  | { status: "not_found" }
  | { status: "no_valid_preview" }
  | { status: "ok" };

// Checkpoint puro de Sprint 4: no persiste ningun dato de negocio propio
// (el contenido de la preview ya vive en "previews"), solo confirma
// currentStep="preview" cuando el usuario pulsa "Continuar explorando"
// sobre una preview valida. Exige que exista una preview valida (nunca se
// puede "completar" una preview que no existe o que fallo/es
// insufficient_data) -- mismo guard que usara priced-intent-service para
// el paso siguiente.
//
// El cliente espera (await) esta llamada antes de navegar al paywall
// (encargo Sprint 4, "no fire-and-forget para el checkpoint de
// preview_completion"): un fallo aqui debe mostrarse como error
// recuperable, nunca ignorarse en silencio.
export async function completePreviewForFlowAttempt(
  repository: ExperimentRepository,
  flowAttemptId: string
): Promise<CompletePreviewOutcome> {
  const attempt = await repository.getFlowAttemptById(flowAttemptId);
  if (!attempt) return { status: "not_found" };

  const validPreview = await repository.getValidPreviewByFlowAttempt(flowAttemptId);
  if (!validPreview) return { status: "no_valid_preview" };

  await repository.updateFlowAttemptProgress({ flowAttemptId, currentStep: "preview" });
  return { status: "ok" };
}
