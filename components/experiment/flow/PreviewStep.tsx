"use client";

import { useEffect, useRef, useState } from "react";

import type { Segment } from "@/types/experiment";
import type { ApiErrorResponse, PreviewGenerateResponse } from "@/types/api";
import type { PreviewV1Output } from "@/types/preview";

import PreviewCard from "@/components/experiment/preview/PreviewCard";
import PreviewInsufficientData from "@/components/experiment/preview/PreviewInsufficientData";

import type { CaptureEventFn } from "./capture";

interface PreviewStepProps {
  flowAttemptId: string;
  segment: Segment;
  capture: CaptureEventFn;
  // Solo relevante para segmento B: vuelve a la pantalla de datos de la
  // otra persona cuando el resultado es "insufficient_data" (encargo
  // Sprint 3B, seccion 9).
  onEditPartner?: () => void;
  // Sprint 4: se llama SOLO despues de que POST /api/preview/complete
  // confirme el checkpoint currentStep="preview" (nunca de forma
  // optimista) -- el padre avanza a la seccion "paywall".
  onPreviewCompleted: () => void;
}

type PreviewStatus = "loading" | "ready" | "insufficient_data" | "error";

// preview_view solo debe registrarse una vez por preview mostrada
// (VEGA_Plan_Tecnico, seccion 42), incluso si el componente se
// remonta (ej. navegacion hacia atras/adelante) sin generar una preview
// nueva.
function alreadyCapturedPreviewView(previewId: string): boolean {
  try {
    return sessionStorage.getItem(`preview_view:${previewId}`) === "true";
  } catch {
    return false;
  }
}

function markPreviewViewCaptured(previewId: string): void {
  try {
    sessionStorage.setItem(`preview_view:${previewId}`, "true");
  } catch {
    // sessionStorage puede no estar disponible (modo privado, etc.): el
    // peor caso es capturar preview_view una vez de mas, aceptable.
  }
}

// Pipeline de Sprint 3A (segmento A) y Sprint 3B (segmento B):
// onboarding_complete -> POST /api/preview (Vega + OpenAI ya resueltos
// server-side) -> preview visible. Idempotente: reintentar o remontar el
// componente nunca genera una preview duplicada (el backend devuelve la
// ya valida si existe). Segmento B puede resolver en "insufficient_data"
// (Vega no pudo construir una sinastria fiable): ese resultado nunca se
// cuenta como preview_generation_error, y dispara
// partner_analysis_possible/partner_analysis_not_viable (Sprint 3B) a
// partir del resultado REAL del motor, no de la precision local derivada
// en PartnerStep.
export default function PreviewStep({
  flowAttemptId,
  segment,
  capture,
  onEditPartner,
  onPreviewCompleted,
}: PreviewStepProps) {
  const [status, setStatus] = useState<PreviewStatus>("loading");
  const [preview, setPreview] = useState<{ id: string; output: PreviewV1Output } | null>(null);
  const [attemptToken, setAttemptToken] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState(false);
  const requestInFlightRef = useRef(false);

  useEffect(() => {
    if (requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    setStatus("loading");

    capture("preview_generation_start");

    fetch("/api/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flowAttemptId }),
    })
      .then(async (response) => {
        const body = (await response.json()) as PreviewGenerateResponse | ApiErrorResponse;

        if ("status" in body && body.status === "insufficient_data") {
          if (segment === "B") capture("partner_analysis_not_viable");
          setStatus("insufficient_data");
          return;
        }

        if (!("status" in body) || body.status !== "valid" || !body.ok) {
          const errorType = "status" in body && body.status === "error" ? body.errorType : "unknown";
          capture("preview_generation_error", { errorType });
          setStatus("error");
          return;
        }

        if (segment === "B") capture("partner_analysis_possible");

        if (!alreadyCapturedPreviewView(body.previewId)) {
          capture("preview_view");
          markPreviewViewCaptured(body.previewId);
        }
        setPreview({ id: body.previewId, output: body.preview });
        setStatus("ready");
      })
      .catch(() => {
        capture("preview_generation_error", { errorType: "unknown" });
        setStatus("error");
      })
      .finally(() => {
        requestInFlightRef.current = false;
      });
    // attemptToken fuerza un nuevo intento explicito (boton "Reintentar")
    // sin perder los datos de onboarding ya persistidos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowAttemptId, attemptToken]);

  const handleRetry = () => setAttemptToken((token) => token + 1);

  // Sprint 4: avanzar al paywall espera la confirmacion de POST
  // /api/preview/complete -- un fallo aqui muestra un error recuperable en
  // vez de navegar sobre un checkpoint no confirmado (encargo Sprint 4,
  // ajuste final punto 2). capture("preview_completion") solo se dispara
  // tras esa confirmacion (nunca de forma optimista ni en cada intento
  // fallido, para no registrar una finalizacion que no ocurrio de
  // verdad). El guard de completingRef, ademas del disabled del boton en
  // PreviewCard, evita que un doble clic dispare dos peticiones/eventos.
  const completingRef = useRef(false);
  const handleContinue = async () => {
    if (completingRef.current) return;
    completingRef.current = true;
    setCompleting(true);
    setCompleteError(false);
    try {
      const response = await fetch("/api/preview/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flowAttemptId }),
      });
      const body = (await response.json()) as { ok?: boolean };
      if (!response.ok || body.ok !== true) throw new Error("checkpoint no confirmado");
      capture("preview_completion");
      onPreviewCompleted();
    } catch {
      setCompleteError(true);
    } finally {
      setCompleting(false);
      completingRef.current = false;
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-xl text-center items-center">
      <h1 className="text-2xl font-bold">Tu primera lectura</h1>

      {status === "loading" && (
        <p className="opacity-70">
          {segment === "B" ? "Generando vuestra lectura..." : "Generando tu lectura personalizada..."}
        </p>
      )}

      {status === "insufficient_data" && <PreviewInsufficientData onEditPartner={onEditPartner} />}

      {status === "error" && (
        <div className="flex flex-col gap-4 items-center">
          <p className="opacity-70">
            No hemos podido generar tu lectura correctamente. Puedes volver a intentarlo sin perder los datos
            introducidos.
          </p>
          <button type="button" className="btn btn-primary" onClick={handleRetry}>
            Reintentar
          </button>
        </div>
      )}

      {status === "ready" && preview && (
        <>
          <PreviewCard preview={preview.output} onContinue={handleContinue} continuing={completing} />
          {completeError && (
            <p className="text-sm text-error" role="alert">
              No hemos podido continuar. Puedes volver a intentarlo.
            </p>
          )}
        </>
      )}
    </div>
  );
}
