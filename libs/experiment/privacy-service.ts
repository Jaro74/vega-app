import type { ExperimentRepository, ExperimentUserRecord } from "@/libs/db/types";
import type { PrivacyFlowAttemptSummary, PrivacySummaryResponse } from "@/types/api";

// Logica de negocio del canal minimo de ejercicio de derechos para la
// beta, sin dependencia de Next.js: las rutas (app/api/privacy/*) solo
// traducen HTTP <-> estas funciones, mismo patron que session-service.ts/
// onboarding-service.ts.
//
// "Resumen de datos asociados a la sesion actual" -- ver el comentario
// extenso en types/api.ts (PrivacySummaryResponse): no se presenta como
// cumplimiento definitivo del derecho de acceso del RGPD.

export async function buildPrivacySummary(
  repository: ExperimentRepository,
  user: ExperimentUserRecord
): Promise<PrivacySummaryResponse> {
  const attempts = await repository.listFlowAttemptsForUser(user.id);

  const flowAttempts: PrivacyFlowAttemptSummary[] = await Promise.all(
    attempts.map(async (attempt) => {
      const [problemContext, partnerInput, partnerDerivedProfile, validPreview, pricedAccessIntent, waitlistEntry] =
        await Promise.all([
          repository.getProblemContextByFlowAttempt(attempt.id),
          repository.getPartnerInputByFlowAttempt(attempt.id),
          repository.getPartnerDerivedProfileByFlowAttempt(attempt.id),
          repository.getValidPreviewByFlowAttempt(attempt.id),
          repository.getPricedAccessIntentByFlowAttempt(attempt.id),
          repository.getWaitlistEntryByFlowAttempt(attempt.id),
        ]);

      return {
        flowAttemptId: attempt.id,
        segment: attempt.segment,
        isPrimaryAttempt: attempt.isPrimaryAttempt,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        hasProblemContext: problemContext !== null,
        hasPartnerInputPending: partnerInput !== null,
        hasPartnerDerivedProfile: partnerDerivedProfile !== null,
        hasValidPreview: validPreview !== null,
        hasPricedAccessIntent: pricedAccessIntent !== null,
        waitlistEntry: waitlistEntry
          ? {
              email: waitlistEntry.email,
              createdAt: waitlistEntry.createdAt,
              consentVersion: waitlistEntry.consentVersion,
            }
          : null,
      };
    })
  );

  const ownBirthProfile = await repository.getOwnBirthProfileByUser(user.id);

  return {
    anonymousUserId: user.anonymousUserId,
    firstSeenAt: user.firstSeenAt,
    hasOwnBirthProfile: ownBirthProfile !== null,
    flowAttempts,
  };
}

export interface DeleteAllOwnDataResult {
  flowAttemptsAffected: number;
  waitlistEntryDeleted: boolean;
}

// Borra el nucleo purgable de TODOS los intentos del usuario (no solo el
// primario) mas, si existe, la entrada de waitlist de cualquiera de
// ellos -- en la MISMA operacion, antes de que la ruta
// (app/api/privacy/delete-all/route.ts) invalide las cookies de sesion.
// Hacerlo asi, de forma comprehensiva, es deliberado: evita que el orden
// en que se pulsen dos botones separados pueda dejar la waitlist
// inalcanzable despues de invalidar la sesion.
//
// Nunca toca experiment_users, flow_attempts (ni sus columnas
// current_step/trigger/partner_precision/completed_at) ni
// priced_access_intents: la invalidacion de sesion (responsabilidad de
// la ruta, no de esta funcion) es lo que impide reabrir el flow_attempt
// antiguo, asi que no hace falta resetear ningun estado tecnico para
// evitar inconsistencias (ver analisis de consistencia ya discutido:
// resolveNextStep(segment, null) nunca se ejecuta para este intento
// porque la sesion que lo recuperaria ya no existe).
export async function deleteAllOwnData(
  repository: ExperimentRepository,
  userId: string
): Promise<DeleteAllOwnDataResult> {
  const attempts = await repository.listFlowAttemptsForUser(userId);
  let waitlistEntryDeleted = false;

  for (const attempt of attempts) {
    await repository.deleteProblemContext(attempt.id);
    await repository.deletePartnerInput(attempt.id);
    await repository.deletePartnerDerivedProfile(attempt.id);
    await repository.deletePreviewsForFlowAttempt(attempt.id);

    const waitlistEntry = await repository.getWaitlistEntryByFlowAttempt(attempt.id);
    if (waitlistEntry) {
      await repository.deleteWaitlistEntry(attempt.id);
      waitlistEntryDeleted = true;
    }
  }

  await repository.deleteOwnBirthProfile(userId);

  return { flowAttemptsAffected: attempts.length, waitlistEntryDeleted };
}

export interface DeleteOwnWaitlistEntryResult {
  deleted: boolean;
}

// Accion independiente de deleteAllOwnData: borra UNICAMENTE la entrada
// de waitlist, sin tocar el resto del nucleo y sin que la ruta invalide
// ninguna cookie -- para quien quiera salir de la lista de espera sin
// perder su sesion ni el resto de sus datos.
export async function deleteOwnWaitlistEntry(
  repository: ExperimentRepository,
  userId: string
): Promise<DeleteOwnWaitlistEntryResult> {
  const attempts = await repository.listFlowAttemptsForUser(userId);
  let deleted = false;

  for (const attempt of attempts) {
    const waitlistEntry = await repository.getWaitlistEntryByFlowAttempt(attempt.id);
    if (waitlistEntry) {
      await repository.deleteWaitlistEntry(attempt.id);
      deleted = true;
    }
  }

  return { deleted };
}
