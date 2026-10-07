"use client";

import { useState } from "react";

import { FREE_TEXT_MAX_LENGTH } from "@/libs/experiment/constants";
import { TRIGGER_LABELS_A, TRIGGER_LABELS_B } from "@/libs/experiment/trigger-labels";
import type { Segment, Trigger } from "@/types/experiment";
import type { ApiErrorResponse, ProblemResponse } from "@/types/api";

import type { CaptureEventFn } from "./capture";

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
export default function ProblemStep({ segment, flowAttemptId, capture, onComplete }: ProblemStepProps) {
  const [subStep, setSubStep] = useState<"trigger" | "text">("trigger");
  const [trigger, setTrigger] = useState<Trigger | null>(null);
  const [freeText, setFreeText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labels = segment === "A" ? TRIGGER_LABELS_A : TRIGGER_LABELS_B;
  const options = Object.entries(labels) as [Trigger, string][];

  const handleSelectTrigger = (value: Trigger) => {
    setTrigger(value);
    capture("problem_selected", { trigger: value });
    setSubStep("text");
  };

  const handleSubmit = async () => {
    if (!trigger || submitting) return;
    setSubmitting(true);
    setError(null);

    const trimmed = freeText.trim();
    if (trimmed.length > 0) {
      capture("problem_text_added", {
        problemTextProvided: true,
        characterCount: trimmed.length,
      });
    }

    try {
      const response = await fetch("/api/problem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flowAttemptId, trigger, freeText: trimmed || undefined }),
      });

      if (!response.ok) {
        const body = (await response.json()) as ApiErrorResponse;
        throw new Error(body.error);
      }

      (await response.json()) as ProblemResponse;
      capture("problem_complete", { trigger });
      onComplete();
    } catch {
      setError("No hemos podido guardar tu respuesta. Inténtalo de nuevo.");
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
        {segment === "A" ? "Si quieres, cuéntale a Vega un poco más" : "Si quieres, cuéntale a Vega qué está ocurriendo"}
      </h1>
      <p className="text-center opacity-70">
        No necesitas contar toda tu historia. Una o dos frases pueden ayudarnos a hacer la experiencia
        más específica.
      </p>
      <textarea
        className="textarea textarea-bordered w-full"
        rows={4}
        maxLength={FREE_TEXT_MAX_LENGTH}
        placeholder="Últimamente siento que..."
        value={freeText}
        onChange={(event) => setFreeText(event.target.value)}
      />
      <p className="text-xs text-right opacity-50">
        {freeText.length}/{FREE_TEXT_MAX_LENGTH}
      </p>

      {error && <p className="text-error text-sm">{error}</p>}

      <button type="button" className="btn btn-primary" disabled={submitting} onClick={handleSubmit}>
        {submitting ? "Guardando..." : "Continuar"}
      </button>
    </div>
  );
}
