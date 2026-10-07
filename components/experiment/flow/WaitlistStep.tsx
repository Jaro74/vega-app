"use client";

import { useRef, useState } from "react";

import { WAITLIST_CONSENT_VERSION } from "@/libs/experiment/constants";
import type { ApiErrorResponse, WaitlistResponse } from "@/types/api";

import type { CaptureEventFn } from "./capture";

interface WaitlistStepProps {
  flowAttemptId: string;
  capture: CaptureEventFn;
  // GET /api/session (waitlistSubmitted): si ya se envio el email antes de
  // un refresh, se muestra directamente la pantalla final sin volver a
  // pedirlo.
  initialWaitlistSubmitted: boolean;
}

// Pantalla final de la lista de espera (encargo Sprint 4, punto 5 y
// ajuste final punto 3): finalidad estrictamente limitada a avisar sobre
// el acceso a la beta, nunca marketing. Aceptacion explicita mediante un
// checkbox sin marcar por defecto (no basta con pulsar "Apuntarme"), con
// enlace a /privacy-policy. El email nunca sale de aqui hacia PostHog.
export default function WaitlistStep({ flowAttemptId, capture, initialWaitlistSubmitted }: WaitlistStepProps) {
  const [submitted, setSubmitted] = useState(initialWaitlistSubmitted);
  const [email, setEmail] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // useRef (no solo el estado submitting): dos clics sincronos en el mismo
  // tick leerian el mismo submitting obsoleto y ambos pasarian el guard
  // -- mismo patron que completingRef en PreviewStep/PaywallStep.
  const submittingRef = useRef(false);
  const handleSubmit = async () => {
    if (submittingRef.current || !consentChecked) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flowAttemptId, email, consentVersion: WAITLIST_CONSENT_VERSION }),
      });
      const body = (await response.json()) as WaitlistResponse | ApiErrorResponse;
      if (!response.ok || !("ok" in body) || !body.ok) {
        throw new Error("ok" in body ? undefined : (body as ApiErrorResponse).error);
      }

      if (body.wasNew) capture("waitlist_submit");
      setSubmitted(true);
    } catch {
      submittingRef.current = false;
      setSubmitError("No hemos podido guardar tu email. Revisa que sea correcto e inténtalo de nuevo.");
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col gap-4 w-full max-w-xl text-center items-center">
        <h1 className="text-2xl font-bold">¡Ya estás en la lista!</h1>
        <p className="opacity-70">Te avisaremos por email en cuanto podamos ofrecerte acceso a Vega.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-sm">
      <h1 className="text-2xl font-bold text-center">Apúntate a la beta</h1>
      <p className="opacity-70 text-center">Déjanos tu email y te avisaremos cuando podamos ofrecerte acceso.</p>

      <div className="form-control">
        <label className="label" htmlFor="waitlist-email">
          <span className="label-text">Email</span>
        </label>
        <input
          id="waitlist-email"
          type="email"
          className="input input-bordered w-full"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="tu@email.com"
        />
      </div>

      <div className="form-control">
        <label className="label cursor-pointer justify-start gap-3 items-start">
          <input
            type="checkbox"
            className="checkbox mt-1"
            checked={consentChecked}
            onChange={(event) => setConsentChecked(event.target.checked)}
            aria-label="Acepto que Vega guarde mi email únicamente para avisarme sobre el acceso a la beta"
          />
          <span className="label-text text-left">
            He leído la{" "}
            <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="link link-primary">
              información de privacidad
            </a>{" "}
            y acepto que Vega guarde mi email únicamente para avisarme sobre el acceso a la beta.
          </span>
        </label>
      </div>

      {submitError && <p className="text-error text-sm">{submitError}</p>}

      <button
        type="button"
        className="btn btn-primary"
        disabled={submitting || !consentChecked}
        onClick={handleSubmit}
      >
        {submitting ? "Enviando..." : "Apuntarme"}
      </button>
    </div>
  );
}
