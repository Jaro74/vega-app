import { EXPERIMENT_ID } from "@/libs/experiment/constants";
import type {
  AcquisitionData,
  ExperimentRepository,
  FlowAttemptRecord,
} from "@/libs/db/types";
import { UniqueConstraintViolationError } from "@/libs/db/types";
import type { Segment } from "@/types/experiment";

// Logica de negocio de Sprint 1, deliberadamente sin ninguna dependencia
// de Next.js (cookies/request/response): las rutas (app/api/session,
// app/api/segment) son una capa fina que solo traduce cookies <-> estas
// funciones. Esto es lo que permite testear la logica con
// InMemoryExperimentRepository sin levantar un servidor HTTP.

export interface BootstrapSessionInput {
  anonymousUserId: string | null;
  existingFlowAttemptId: string | null;
  acquisition: AcquisitionData;
  isTest: boolean;
}

export interface BootstrapSessionResult {
  anonymousUserId: string;
  userId: string;
  isNewAnonymousUser: boolean;
  isTest: boolean;
  acquisition: AcquisitionData;
  activeAttempt: FlowAttemptRecord | null;
}

export async function bootstrapSession(
  repository: ExperimentRepository,
  input: BootstrapSessionInput
): Promise<BootstrapSessionResult> {
  const isNewAnonymousUser = !input.anonymousUserId;
  const anonymousUserId = input.anonymousUserId ?? crypto.randomUUID();

  const user = await repository.findOrCreateExperimentUser({
    anonymousUserId,
    experimentId: EXPERIMENT_ID,
    acquisition: input.acquisition,
    isTest: input.isTest,
  });

  let activeAttempt: FlowAttemptRecord | null = null;
  if (input.existingFlowAttemptId) {
    const attempt = await repository.getFlowAttemptById(input.existingFlowAttemptId);
    if (attempt && attempt.userId === user.id) {
      activeAttempt = attempt;
    }
  }

  return {
    anonymousUserId,
    userId: user.id,
    isNewAnonymousUser,
    isTest: user.isTest,
    acquisition: user.acquisition,
    activeAttempt,
  };
}

export interface SelectSegmentInput {
  userId: string;
  requestedSegment: Segment;
  existingFlowAttemptId: string | null;
}

export interface SelectSegmentResult {
  flowAttemptId: string;
  isPrimaryAttempt: boolean;
  created: boolean;
}

// Regla de cambio de segmento (VEGA_Fase_4C seccion 7 / Plan Tecnico
// seccion 7): antes de problem_complete (que todavia no existe en
// Sprint 1) el usuario puede reelegir libremente. Reelegir el MISMO
// segmento del intento activo es un no-op idempotente (evita duplicar
// por doble clic o refresh); elegir un segmento DISTINTO crea un nuevo
// intento secundario sin tocar el primario.
export async function selectSegment(
  repository: ExperimentRepository,
  input: SelectSegmentInput
): Promise<SelectSegmentResult> {
  if (input.existingFlowAttemptId) {
    const existing = await repository.getFlowAttemptById(input.existingFlowAttemptId);
    if (existing && existing.userId === input.userId && existing.segment === input.requestedSegment) {
      return { flowAttemptId: existing.id, isPrimaryAttempt: existing.isPrimaryAttempt, created: false };
    }
  }

  try {
    const created = await repository.createFlowAttempt({
      userId: input.userId,
      segment: input.requestedSegment,
    });
    return { flowAttemptId: created.id, isPrimaryAttempt: created.isPrimaryAttempt, created: true };
  } catch (error) {
    if (error instanceof UniqueConstraintViolationError) {
      const primary = await repository.getPrimaryFlowAttempt(input.userId);
      if (primary) {
        return { flowAttemptId: primary.id, isPrimaryAttempt: true, created: false };
      }
    }
    throw error;
  }
}
