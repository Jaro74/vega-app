"use client";

import { readTestFlagFromLocation } from "@/libs/analytics/client-acquisition";
import { markExperimentReady } from "@/libs/analytics/experiment-ready";
import { useFireOnce } from "@/libs/analytics/hooks";
import { initPostHog } from "@/libs/analytics/posthog-client";
import { EXPERIMENT_ACCEPTING_REAL_TRAFFIC } from "@/libs/experiment/constants";
import type { SessionResponse } from "@/types/api";

// Exportada (ademas del default) para que los tests unitarios puedan
// ejercitarla directamente, con fetch/initPostHog mockeados, sin montar
// el componente React. markExperimentReady(true) solo se llama en el
// unico camino donde identify() realmente se ha ejecutado; cualquier
// otra salida -- trafico suspendido, fetch no-ok, respuesta sin
// anonymousUserId, o PostHog no disponible -- llama a
// markExperimentReady(false), para que captureExperimentEvent() descarte
// los eventos en espera en vez de dejarlos pendientes para siempre.
export async function bootstrapExperiment(): Promise<void> {
  // Suspension de trafico real (libs/experiment/constants.ts): este
  // componente esta montado en el layout raiz y corre en cualquier
  // pagina, no solo /explorar -- sin este guard, una visita real seguiria
  // llamando a /api/session (503) desde cualquier ruta del sitio. El
  // trafico de test (?test=1/vega_test) conserva el comportamiento actual.
  if (!EXPERIMENT_ACCEPTING_REAL_TRAFFIC && !readTestFlagFromLocation()) {
    markExperimentReady(false);
    return;
  }

  const search = typeof window !== "undefined" ? window.location.search : "";
  const response = await fetch(`/api/session${search}`);
  if (!response.ok) {
    markExperimentReady(false);
    return;
  }

  const data = (await response.json()) as SessionResponse;
  if (!data.anonymousUserId) {
    markExperimentReady(false);
    return;
  }

  const posthog = initPostHog();
  if (!posthog) {
    markExperimentReady(false);
    return;
  }

  posthog.identify(data.anonymousUserId);
  markExperimentReady(true);
}

// Montado una vez en app/layout.tsx. Crea (o recupera) el
// anonymous_user_id lo antes posible -- incluso en la landing, antes de
// que el usuario elija segmento -- e identifica ese id en PostHog. Un
// fallo aqui nunca debe romper la pagina (VEGA_Plan_Tecnico, principio
// 5): el catch no hace nada visible, pero SI desbloquea el gate (en
// "blocked") para que ningun evento quede esperando para siempre.
export default function ExperimentBootstrap(): null {
  useFireOnce(() => {
    bootstrapExperiment().catch(() => {
      markExperimentReady(false);
    });
  });

  return null;
}
