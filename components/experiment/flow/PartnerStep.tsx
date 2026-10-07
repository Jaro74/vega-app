"use client";

import { useState } from "react";

import { birthDateSchema, birthTimeSchema } from "@/libs/validation/profile";
import type { PartnerPrecision } from "@/types/experiment";
import type { ApiErrorResponse, PartnerResponse, PlaceSearchResult } from "@/types/api";

import type { CaptureEventFn } from "./capture";
import PlaceAutocomplete from "./PlaceAutocomplete";

interface PartnerStepProps {
  flowAttemptId: string;
  capture: CaptureEventFn;
  onComplete: () => void;
}

const PRECISION_EVENT: Record<PartnerPrecision, "partner_full_data" | "partner_partial_data" | "partner_minimal_data"> = {
  full: "partner_full_data",
  partial: "partner_partial_data",
  minimal: "partner_minimal_data",
};

// Pantallas B7 + E (VEGA_Fase_4C): datos de la segunda persona con tres
// niveles de precision (full/partial/minimal), que decide siempre el
// servidor (POST /api/partner -> derivePartnerPrecision), nunca el
// navegador. Nunca se solicita nombre, email ni ningun dato de contacto.
export default function PartnerStep({ flowAttemptId, capture, onComplete }: PartnerStepProps) {
  const [subStep, setSubStep] = useState<"intro" | "form">("intro");
  const [birthDate, setBirthDate] = useState("");
  const [dateError, setDateError] = useState<string | null>(null);
  const [timeKnown, setTimeKnown] = useState(false);
  const [birthTime, setBirthTime] = useState("");
  const [timeError, setTimeError] = useState<string | null>(null);
  const [place, setPlace] = useState<PlaceSearchResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleIntroContinue = () => {
    capture("partner_data_start");
    setSubStep("form");
  };

  const handleSubmit = async () => {
    if (submitting) return;

    const dateResult = birthDateSchema.safeParse(birthDate);
    if (!dateResult.success) {
      setDateError(dateResult.error.issues[0]?.message ?? "Revisa la fecha introducida.");
      return;
    }
    setDateError(null);

    if (timeKnown) {
      const timeResult = birthTimeSchema.safeParse(birthTime);
      if (!timeResult.success) {
        setTimeError("Formato de hora inválido.");
        return;
      }
    }
    setTimeError(null);

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowAttemptId,
          birthDate,
          birthTimeKnown: timeKnown,
          birthTime: timeKnown ? birthTime : undefined,
          placeId: place?.placeId,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as ApiErrorResponse;
        throw new Error(body.error);
      }

      const body = (await response.json()) as PartnerResponse;
      capture(PRECISION_EVENT[body.partnerPrecision], { partnerPrecision: body.partnerPrecision });
      // partner_analysis_possible/partner_analysis_not_viable (Sprint 3B)
      // ya no se disparan aqui: solo se sabe si Vega puede construir una
      // sinastria fiable tras llamar a /evidence/synastry, asi que ese
      // evento lo dispara PreviewStep a partir del resultado real de
      // /api/preview, no de la precision local derivada en este submit.
      capture("onboarding_complete");
      onComplete();
    } catch {
      setSubmitError("No hemos podido guardar los datos. Inténtalo de nuevo.");
      setSubmitting(false);
    }
  };

  if (subStep === "intro") {
    return (
      <div className="flex flex-col gap-6 w-full max-w-xl text-center">
        <h1 className="text-2xl font-bold">Podemos añadir los datos de la otra persona</h1>
        <p className="opacity-70">
          Cuanta más información tengamos, más completa podrá ser la comparación. No necesitamos su
          nombre, email ni ningún dato de contacto. Si no conoces su hora o lugar de nacimiento, puedes
          continuar igualmente.
        </p>
        <button type="button" className="btn btn-primary" onClick={handleIntroContinue}>
          Añadir los datos que conozco
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-sm">
      <h1 className="text-2xl font-bold text-center">Datos de la otra persona</h1>

      <div className="form-control">
        <label className="label" htmlFor="partner-birth-date">
          <span className="label-text">Fecha de nacimiento</span>
        </label>
        <input
          id="partner-birth-date"
          type="date"
          className="input input-bordered w-full"
          value={birthDate}
          onChange={(event) => setBirthDate(event.target.value)}
          max={new Date().toISOString().slice(0, 10)}
        />
        {dateError && <p className="text-error text-sm">{dateError}</p>}
      </div>

      <div className="form-control">
        <label className="label cursor-pointer justify-start gap-3">
          <input
            type="checkbox"
            className="checkbox"
            checked={timeKnown}
            onChange={(event) => setTimeKnown(event.target.checked)}
          />
          <span className="label-text">Conozco su hora de nacimiento</span>
        </label>
        {timeKnown && (
          <input
            type="time"
            className="input input-bordered w-full mt-2"
            value={birthTime}
            onChange={(event) => setBirthTime(event.target.value)}
          />
        )}
        {timeError && <p className="text-error text-sm">{timeError}</p>}
      </div>

      <PlaceAutocomplete label="Lugar de nacimiento (opcional)" selectedPlace={place} onSelect={setPlace} />

      {submitError && <p className="text-error text-sm">{submitError}</p>}

      <button type="button" className="btn btn-primary" disabled={submitting} onClick={handleSubmit}>
        {submitting ? "Guardando..." : "Continuar"}
      </button>
    </div>
  );
}
