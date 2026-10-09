"use client";

import { useState } from "react";

import { FREE_TEXT_CONSENT_VERSION, FREE_TEXT_MAX_LENGTH } from "@/libs/experiment/constants";
import { checkThirdPartySensitiveText } from "@/libs/experiment/third-party-sensitive-text-filter";
import { TRIGGER_LABELS_A, TRIGGER_LABELS_B } from "@/libs/experiment/trigger-labels";
import type { Segment, Trigger } from "@/types/experiment";
import type { ApiErrorResponse, ProblemResponse } from "@/types/api";

import type { CaptureEventFn } from "./capture";

const FREE_TEXT_NOTICE =
  "Este campo es opcional: puedes continuar sin rellenarlo. No introduzcas datos de salud, orientación o vida sexual, religión o creencias, origen racial o étnico, afiliación sindical, ni datos genéticos o biométricos — ni tuyos ni de ninguna otra persona. Si decides incluir alguno de estos datos sobre ti mismo, tu consentimiento explícito (casilla de abajo) nos permite tratarlo, exclusivamente para generar tu interpretación personalizada. Ese consentimiento no puede autorizar, en ningún caso, el tratamiento de esos mismos datos si pertenecen a otra persona — el RGPD exige que sea esa persona, y no tú, quien los consienta.";

const FREE_TEXT_CONSENT_CHECKBOX_LABEL =
  "Doy mi consentimiento para que Vega trate el texto que he escrito arriba, incluida cualquier información sobre salud, orientación o vida sexual, religión o creencias, origen racial o étnico, afiliación sindical, o datos genéticos o biométricos que sean míos y que haya decidido incluir, con la única finalidad de generar mi interpretación personalizada. Este consentimiento no cubre el tratamiento de esos datos cuando pertenezcan a otra persona.";

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
const FILTER_BLOCKED_MESSAGE = "Parece que este texto puede incluir datos sobre otra persona. Por favor, edítalo para hablar solo de tu propia situación.";
const VERSION_CONFLICT_MESSAGE = "El texto de consentimiento se ha actualizado. Vuelve a marcar la casilla para continuar.";

function errorMessageFor(status: number, serverError: string): string {
  if (status === 409) return VERSION_CONFLICT_MESSAGE;
  if (status === 400 && serverError.includes("consentimiento explicito")) return MISSING_CONSENT_MESSAGE;
  if (status === 400 && serverError.includes("parece incluir datos de otra persona")) return FILTER_BLOCKED_MESSAGE;
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
    if (hasFreeText && checkThirdPartySensitiveText(trimmedFreeText).blocked) {
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
        <label className="form-control flex-row items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="checkbox checkbox-sm mt-1"
            checked={freeTextConsentChecked}
            onChange={(event) => setFreeTextConsentChecked(event.target.checked)}
          />
          <span className="text-sm">{FREE_TEXT_CONSENT_CHECKBOX_LABEL}</span>
        </label>
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
