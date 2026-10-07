"use client";

import { useRef, useState } from "react";

import { useFireOnce } from "@/libs/analytics/hooks";
import type { ApiErrorResponse, PricedIntentResponse } from "@/types/api";

import type { CaptureEventFn } from "./capture";

interface PaywallStepProps {
  flowAttemptId: string;
  capture: CaptureEventFn;
  // Se llama SOLO despues de que POST /api/priced-intent confirme el
  // checkpoint currentStep="access_intent" -- el padre avanza a la
  // seccion "waitlist".
  onIntentConfirmed: () => void;
}

// paywall_view solo debe registrarse una vez por flow_attempt (mismo
// espiritu que preview_view en PreviewStep), incluso si el componente se
// remonta (refresh) sin que el usuario haya avanzado.
function alreadyCapturedPaywallView(flowAttemptId: string): boolean {
  try {
    return sessionStorage.getItem(`paywall_view:${flowAttemptId}`) === "true";
  } catch {
    return false;
  }
}

function markPaywallViewCaptured(flowAttemptId: string): void {
  try {
    sessionStorage.setItem(`paywall_view:${flowAttemptId}`, "true");
  } catch {
    // sessionStorage puede no estar disponible: el peor caso es capturar
    // paywall_view una vez de mas, aceptable.
  }
}

// Fake door transparente (encargo Sprint 4): precio y condiciones fijos
// para A y B, sin promesas de funcionalidades que todavia no existen. Dos
// sub-pasos puramente locales -- "offer" (precio + CTA) y "confirm"
// (segunda confirmacion explicita) -- que nunca se persisten ni avanzan
// currentStep por si solos: solo la confirmacion final
// (POST /api/priced-intent) lo hace. Esto es deliberado: distingue un
// clic (priced_cta_click, evento de interfaz) de una intencion confirmada
// (priced_access_intent, gobernada por una fila real en Supabase).
export default function PaywallStep({ flowAttemptId, capture, onIntentConfirmed }: PaywallStepProps) {
  const [subStep, setSubStep] = useState<"offer" | "confirm">("offer");
  const [ctaDisabled, setCtaDisabled] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState(false);

  useFireOnce(() => {
    if (alreadyCapturedPaywallView(flowAttemptId)) return;
    capture("paywall_view");
    markPaywallViewCaptured(flowAttemptId);
  });

  // Guards con useRef (no useState): dos clics sincronos en el mismo tick
  // (antes de que React re-renderice con disabled=true) leerian el mismo
  // valor de estado obsoleto y ambos pasarian el guard si este fuera solo
  // "if (ctaDisabled/confirming) return". Un ref se muta de forma
  // sincrona e inmediata, visible para la segunda invocacion aunque no
  // haya habido re-render todavia -- mismo patron que completingRef en
  // PreviewStep.
  const ctaClickedRef = useRef(false);
  const handleCtaClick = () => {
    if (ctaClickedRef.current) return;
    ctaClickedRef.current = true;
    setCtaDisabled(true);
    capture("priced_cta_click");
    setSubStep("confirm");
  };

  const confirmingRef = useRef(false);
  const handleConfirm = async () => {
    if (confirmingRef.current) return;
    confirmingRef.current = true;
    setConfirming(true);
    setConfirmError(false);
    try {
      const response = await fetch("/api/priced-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flowAttemptId }),
      });
      const body = (await response.json()) as PricedIntentResponse | ApiErrorResponse;
      if (!response.ok || !("ok" in body) || !body.ok) throw new Error("intento no confirmado");

      if (body.wasNew) capture("priced_access_intent");
      onIntentConfirmed();
    } catch {
      setConfirmError(true);
      setConfirming(false);
      confirmingRef.current = false;
    }
  };

  if (subStep === "offer") {
    return (
      <div className="flex flex-col gap-6 w-full max-w-xl text-center items-center">
        <h1 className="text-2xl font-bold">Continúa con Vega</h1>
        <p className="opacity-70">
          Has visto una primera interpretación. La experiencia completa te permitiría profundizar en los
          patrones relevantes y continuar preguntando sobre tu situación.
        </p>

        <p className="text-3xl font-bold" data-testid="paywall-price">
          9,99 €
        </p>
        <p className="text-sm opacity-70">Pago único previsto para esta experiencia.</p>

        <p className="text-sm opacity-80 max-w-md">
          Vega está actualmente en beta cerrada. Hoy no se realizará ningún cargo ni te pediremos datos de
          tarjeta.
        </p>

        <button type="button" className="btn btn-primary" disabled={ctaDisabled} onClick={handleCtaClick}>
          Quiero acceso por 9,99 €
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-xl text-center items-center">
      <h1 className="text-2xl font-bold">Solicitar acceso anticipado</h1>
      <p className="opacity-70">
        El precio previsto para esta experiencia es <strong>9,99 €</strong>. Vega todavía está en beta
        cerrada y no estamos aceptando pagos. Si quieres acceder cuando abramos las primeras plazas,
        continúa.
      </p>

      {confirmError && (
        <p className="text-sm text-error" role="alert">
          No hemos podido confirmar tu solicitud. Puedes volver a intentarlo.
        </p>
      )}

      <button type="button" className="btn btn-primary" disabled={confirming} onClick={handleConfirm}>
        {confirming ? "Confirmando..." : "Sí, quiero acceso por 9,99 € cuando esté disponible"}
      </button>
    </div>
  );
}
