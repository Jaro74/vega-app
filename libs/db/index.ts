import "server-only";

import { InMemoryExperimentRepository } from "./memory-repository";
import { getSupabaseAdminClient } from "./supabase-admin";
import { SupabaseExperimentRepository } from "./supabase-repository";
import type { ExperimentRepository } from "./types";

export type ExperimentDbDriver = "memory" | "supabase";

// "supabase" exige un proyecto real (NEXT_PUBLIC_SUPABASE_URL +
// SUPABASE_SERVICE_ROLE_KEY) con las migraciones aplicadas. Por defecto
// (o cualquier valor distinto de "supabase") se usa "memory": el driver
// de desarrollo/test de este sandbox, documentado en .env.example.
export function resolveExperimentDbDriver(): ExperimentDbDriver {
  return process.env.EXPERIMENT_DB_DRIVER === "supabase" ? "supabase" : "memory";
}

type GlobalWithRepository = typeof globalThis & {
  __vegaExperimentRepository?: ExperimentRepository;
};

const globalWithRepository = globalThis as GlobalWithRepository;

export function getExperimentRepository(): ExperimentRepository {
  if (!globalWithRepository.__vegaExperimentRepository) {
    globalWithRepository.__vegaExperimentRepository =
      resolveExperimentDbDriver() === "supabase"
        ? new SupabaseExperimentRepository(getSupabaseAdminClient())
        : new InMemoryExperimentRepository();
  }
  return globalWithRepository.__vegaExperimentRepository;
}

// Solo para tests: fuerza recrear el repositorio (y por tanto su estado
// en memoria) entre casos de test independientes.
export function resetExperimentRepositoryForTests(): void {
  globalWithRepository.__vegaExperimentRepository = undefined;
}

export * from "./types";
