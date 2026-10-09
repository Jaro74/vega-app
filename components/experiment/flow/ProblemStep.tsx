"use client";

import { useState } from "react";

import { FREE_TEXT_CONSENT_VERSION, FREE_TEXT_MAX_LENGTH } from "@/libs/experiment/constants";
import { checkDirectIdentifiers } from "@/libs/experiment/direct-identifier-filter";
import { TRIGGER_LABELS_A, TRIGGER_LABELS_B } from "@/libs/experiment/trigger-labels";
import type { Segment, Trigger } from "@/types/experiment";
import type { ApiErrorResponse, ProblemResponse } from "@/types/api";

import type { CaptureEventFn } from "./capture";

const FREE_TEXT_NOTICE =
  "Este campo es opcional. Cuéntanos solo lo necesario para entender tu situación. Evita incluir datos de contacto, documentos de identidad, direcciones u otros datos que permitan identificar directamente a otras personas.";

const FREE_TEXT_CONSENT_CHECKBOX_LABEL =
  "Doy mi consentimiento para que Vega trate el texto que he escrito para generar mi interpretación personalizada, incluida cualquier información sensible sobre mí que decida compartir. Este consentimiento no se extiende a información sensible sobre otras personas.";

// Informativo, deliberadamente fuera del <label> del checkbox: no es
// parte del texto que se consiente, solo un recordatorio de donde
// ejercer la retirada (POST /api/privacy/withdraw-free-text-consent,
// expuesto en /mis-datos).
const FREE_TEXT_WITHDRAWAL_HINT = "Puedes retirar este consentimiento en cualquier momento desde ‘Mis datos’.";

interface ProblemStepProps {
  segment: Segment;
  flowAttemptId: string;
  capture: CaptureEventFn;
  onComplete: () => void;
}

// Pantallas A1-A2 / B1-B2 (VEGA_Fase_4C): seleccion de trigger + texto
// opcional. Un unico POST /api/problem persiste ambos campos juntos
// (contrato Sprint 0), asi que el submit real ocurre al terminar la
// pantalla de texto, no al elegir el trigger.
const GENERIC_ERROR_MESSAGE = "No hemos podido guardar tu respuesta. Inténtalo de nuevo.";
const MISSING_CONSENT_MESSAGE = "Para guardar este texto necesitamos tu consentimiento explícito — marca la casilla de arriba, o borra el texto si prefieres continuar sin él.";
const FILTER_BLOCKED_MESSAGE = "Parece que este texto incluye un dato de contacto o un documento de identidad. Elimínalo antes de continuar — Vega no necesita ese tipo de información.";
const VERSION_CONFLICT_MESSAGE = "El texto de consentimiento se ha actualizado. Vuelve a marcar la casilla para continuar.";

function errorMessageFor(status: number, serverError: string): string {
  if (status === 409) return VERSION_CONFLICT_MESSAGE;
  if (status === 400 && serverError.includes("consentimiento explicito")) return MISSING_CONSENT_MESSAGE;
  if (status === 400 && serverError.includes("dato de contacto o un documento de identidad")) return FILTER_BLOCKED_MESSAGE;
  return GENERIC_ERROR_MESSAGE;
}

export default function ProblemStep({ segment, flowAttemptId, capture, onComplete }: ProblemStepProps) {
  const [subStep, setSubStep] = useState<"trigger" | "text">("trigger");
  const [trigger, setTrigger] = useState<Trigger | null>(null);
  const [freeText, setFreeText] = useState("");
  const [freeTextConsentChecked, setFreeTextConsentChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labels = segment === "A" ? TRIGGER_LABELS_A : TRIGGER_LABELS_B;
  const options = Object.entries(labels) as [Trigger, string][];

  const trimmedFreeText = freeText.trim();
  const hasFreeText = trimmedFreeText.length > 0;

  const handleSelectTrigger = (value: Trigger) => {
    setTrigger(value);
    capture("problem_selected", { trigger: value });
    setSubStep("text");
  };

  const handleFreeTextChange = (value: string) => {
    setFreeText(value);
    // Si el texto queda vacio, el consentimiento ya no es necesario --
    // tampoco debe quedar implicitamente "concedido" para un futuro
    // texto distinto que el usuario pudiera volver a escribir.
    if (value.trim().length === 0 && freeTextConsentChecked) {
      setFreeTextConsentChecked(false);
    }
  };

  const handleSubmit = async () => {
    if (!trigger || submitting) return;
    if (hasFreeText && !freeTextConsentChecked) return;

    // Mismo modulo puro que usa el servidor (submitProblem, autoritativo
    // y obligatorio): esto es solo feedback inmediato, nunca la barrera
    // de seguridad real -- si rechaza, no se llega a hacer la peticion,
    // pero el checkbox/consentimiento ya marcado no se altera.
    if (hasFreeText && checkDirectIdentifiers(trimmedFreeText).blocked) {
      setError(FILTER_BLOCKED_MESSAGE);
      return;
    }

    setSubmitting(true);
    setError(null);

    if (hasFreeText) {
      capture("problem_text_added", {
        problemTextProvided: true,
        characterCount: trimmedFreeText.length,
      });
    }

    try {
      const response = await fetch("/api/problem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowAttemptId,
          trigger,
          freeText: hasFreeText ? trimmedFreeText : undefined,
          freeTextConsentGiven: hasFreeText ? true : undefined,
          freeTextConsentVersion: hasFreeText ? FREE_TEXT_CONSENT_VERSION : undefined,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as ApiErrorResponse;
        setError(errorMessageFor(response.status, body.error));
        setSubmitting(false);
        return;
      }

      (await response.json()) as ProblemResponse;
      capture("problem_complete", { trigger });
      onComplete();
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
      setSubmitting(false);
    }
  };

  if (subStep === "trigger") {
    return (
      <div className="flex flex-col gap-6 w-full max-w-xl">
        <h1 className="text-2xl font-bold text-center">
          {segment === "A" ? "¿Qué quieres comprender mejor?" : "¿Qué quieres comprender mejor de esta relación?"}
        </h1>
        {segment === "A" && (
          <p className="text-center opacity-70">Selecciona la situación que más se parece a lo que estás viviendo ahora.</p>
        )}
        <div className="flex flex-col gap-2">
          {options.map(([value, text]) => (
            <button
              key={value}
              type="button"
              className="btn btn-outline justify-start"
              onClick={() => handleSelectTrigger(value)}
            >
              {text}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-xl">
      <h1 className="text-2xl font-bold text-center">
        {segment === "A" ? "Si quieres, cuéntale a Vega más (opcional)" : "Si quieres, cuéntale a Vega qué está ocurriendo (opcional)"}
      </h1>
      <p className="text-sm opacity-80">{FREE_TEXT_NOTICE}</p>
      <textarea
        className="textarea textarea-bordered w-full"
        rows={4}
        maxLength={FREE_TEXT_MAX_LENGTH}
        placeholder="Últimamente siento que..."
        value={freeText}
        onChange={(event) => handleFreeTextChange(event.target.value)}
      />
      <p className="text-xs text-right opacity-50">
        {freeText.length}/{FREE_TEXT_MAX_LENGTH}
      </p>

      {hasFreeText && (
        <div className="flex flex-col gap-1">
          <label className="form-control flex-row items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="checkbox checkbox-sm mt-1"
              checked={freeTextConsentChecked}
              onChange={(event) => setFreeTextConsentChecked(event.target.checked)}
            />
            <span className="text-sm">{FREE_TEXT_CONSENT_CHECKBOX_LABEL}</span>
          </label>
          <p className="text-xs opacity-70">{FREE_TEXT_WITHDRAWAL_HINT}</p>
        </div>
      )}

      {error && <p className="text-error text-sm">{error}</p>}

      <button
        type="button"
        className="btn btn-primary"
        disabled={submitting || (hasFreeText && !freeTextConsentChecked)}
        onClick={handleSubmit}
      >
        {submitting ? "Guardando..." : "Continuar"}
      </button>
    </div>
  );
}
