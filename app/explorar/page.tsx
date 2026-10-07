"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { readAcquisitionFromLocation, readTestFlagFromLocation } from "@/libs/analytics/client-acquisition";
import { getOrCreateSessionId } from "@/libs/analytics/client-ids";
import { captureExperimentEvent } from "@/libs/analytics/events";
import { useFireOnce } from "@/libs/analytics/hooks";
import { EXPERIMENT_ACCEPTING_REAL_TRAFFIC, EXPERIMENT_SUSPENDED_MESSAGE } from "@/libs/experiment/constants";
import type { Segment } from "@/types/experiment";
import type { SegmentResponse, SessionResponse } from "@/types/api";

interface SegmentOption {
  segment: Segment;
  title: string;
  description: string;
  cta: string;
}

// Copy aprobado en VEGA_Fase_4C, seccion A3.
const SEGMENT_OPTIONS: SegmentOption[] = [
  {
    segment: "A",
    title: "Algo que está pasando en mi vida",
    description: "Bloqueo, cambio, trabajo, identidad, una decisión importante o un patrón que se repite.",
    cta: "Explorar mi situación",
  },
  {
    segment: "B",
    title: "Algo que está pasando en una relación",
    description: "Una conexión, conflicto, distancia, ruptura, ex o dinámica que no terminas de entender.",
    cta: "Explorar esta relación",
  },
];

export default function ExplorarPage() {
  const router = useRouter();
  const [hasActiveAttempt, setHasActiveAttempt] = useState(false);
  const [loadingSegment, setLoadingSegment] = useState<Segment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRealVisitorBlocked, setIsRealVisitorBlocked] = useState(false);

  useFireOnce(() => {
    const acquisition = readAcquisitionFromLocation();
    const isTest = readTestFlagFromLocation();

    // Suspension de trafico real (libs/experiment/constants.ts): ni
    // siquiera se llama a /api/session, para no provocar un 503
    // innecesario ni dar pie a resolver/crear identidad alguna. El
    // trafico de test (?test=1/vega_test) recorre el experimento con
    // normalidad.
    if (!EXPERIMENT_ACCEPTING_REAL_TRAFFIC && !isTest) {
      setIsRealVisitorBlocked(true);
      return;
    }

    fetch(`/api/session${window.location.search}`)
      .then((response) => (response.ok ? (response.json() as Promise<SessionResponse>) : null))
      .then((data) => {
        setHasActiveAttempt(Boolean(data?.segment));
        captureExperimentEvent("router_view", {
          anonymousUserId: data?.anonymousUserId ?? null,
          sessionId: getOrCreateSessionId(),
          segment: null,
          isPrimaryAttempt: null,
          isTest: data?.isTest ?? isTest,
          ...acquisition,
        });
      })
      .catch(() => {
        captureExperimentEvent("router_view", {
          anonymousUserId: null,
          sessionId: getOrCreateSessionId(),
          segment: null,
          isPrimaryAttempt: null,
          isTest,
          ...acquisition,
        });
      });
  });

  const handleSelect = useCallback(
    async (segment: Segment) => {
      if (loadingSegment) return;
      setLoadingSegment(segment);
      setError(null);

      captureExperimentEvent("segment_selected", {
        anonymousUserId: null,
        sessionId: getOrCreateSessionId(),
        segment,
        isPrimaryAttempt: null,
        isTest: readTestFlagFromLocation(),
        ...readAcquisitionFromLocation(),
      });

      try {
        const response = await fetch("/api/segment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ segment }),
        });

        if (!response.ok) {
          throw new Error("No se pudo guardar la seleccion");
        }

        (await response.json()) as SegmentResponse;
        router.push("/flow");
      } catch {
        setError("No hemos podido guardar tu selección. Inténtalo de nuevo.");
        setLoadingSegment(null);
      }
    },
    [loadingSegment, router]
  );

  if (isRealVisitorBlocked) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 py-16">
        <p className="text-center max-w-md opacity-80">{EXPERIMENT_SUSPENDED_MESSAGE}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 py-16">
      <h1 className="text-3xl font-bold text-center">¿Qué quieres comprender mejor ahora?</h1>

      {hasActiveAttempt && (
        <p className="text-sm text-center max-w-md opacity-80">
          Ya has empezado esta experiencia. Si cambias de opción comenzaremos un nuevo intento.
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2 w-full max-w-3xl">
        {SEGMENT_OPTIONS.map((option) => (
          <div key={option.segment} className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">{option.title}</h2>
              <p>{option.description}</p>
              <div className="card-actions justify-end">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={loadingSegment !== null}
                  onClick={() => handleSelect(option.segment)}
                >
                  {loadingSegment === option.segment ? "Guardando..." : option.cta}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-error text-sm">{error}</p>}
    </main>
  );
}
