"use client";

import { useState } from "react";

import { birthDateSchema, birthTimeSchema } from "@/libs/validation/profile";
import type { OwnProfilePrecision, Segment } from "@/types/experiment";
import type { ApiErrorResponse, OwnProfileResponse, PlaceSearchResult } from "@/types/api";

import type { CaptureEventFn } from "./capture";
import PlaceAutocomplete from "./PlaceAutocomplete";

interface OwnProfileStepProps {
  segment: Segment;
  flowAttemptId: string;
  capture: CaptureEventFn;
  onComplete: (result: { precision: OwnProfilePrecision; nextStep: "partner" | "preview" }) => void;
}

type SubStep = "intro" | "date" | "time" | "place";

// Pantallas A3-A6 / B3-B6 (VEGA_Fase_4C): explicacion + fecha + hora(-o-
// desconocida) + lugar de nacimiento propios. Un unico POST /api/own-profile
// persiste los 3 campos juntos al terminar la pantalla de lugar (contrato
// Sprint 0).
export default function OwnProfileStep({ segment, flowAttemptId, capture, onComplete }: OwnProfileStepProps) {
  const [subStep, setSubStep] = useState<SubStep>("intro");
  const [birthDate, setBirthDate] = useState("");
  const [dateError, setDateError] = useState<string | null>(null);
  const [birthTimeKnown, setBirthTimeKnown] = useState<boolean | null>(null);
  const [birthTime, setBirthTime] = useState("");
  const [timeError, setTimeError] = useState<string | null>(null);
  const [place, setPlace] = useState<PlaceSearchResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleIntroContinue = () => {
    capture("own_profile_start");
    setSubStep("date");
  };

  const handleDateContinue = () => {
    const result = birthDateSchema.safeParse(birthDate);
    if (!result.success) {
      setDateError(result.error.issues[0]?.message ?? "Revisa la fecha introducida.");
      return;
    }
    setDateError(null);
    capture("birth_date_added", { birthDateValid: true });
    setSubStep("time");
  };

  const handleTimeContinue = (known: boolean) => {
    if (known) {
      const result = birthTimeSchema.safeParse(birthTime);
      if (!result.success) {
        setTimeError("Formato de hora inválido.");
        return;
      }
    }
    setTimeError(null);
    setBirthTimeKnown(known);
    capture(known ? "birth_time_added" : "birth_time_unknown", { birthTimeKnown: known });
    setSubStep("place");
  };

  const handleSubmit = async () => {
    if (!place || birthTimeKnown === null || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    capture("birth_place_added", {
      birthPlaceValid: true,
      ownProfilePrecision: birthTimeKnown ? "full" : "limited",
    });

    try {
      const response = await fetch("/api/own-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowAttemptId,
          birthDate,
          birthTimeKnown,
          birthTime: birthTimeKnown ? birthTime : undefined,
          placeId: place.placeId,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as ApiErrorResponse;
        throw new Error(body.error);
      }

      const body = (await response.json()) as OwnProfileResponse;
      capture("own_profile_complete", { ownProfilePrecision: body.precision });
      if (segment === "A") {
        capture("onboarding_complete");
      }
      onComplete({ precision: body.precision, nextStep: body.nextStep });
    } catch {
      setSubmitError("No hemos podido guardar tus datos. Inténtalo de nuevo.");
      setSubmitting(false);
    }
  };

  if (subStep === "intro") {
    return (
      <div className="flex flex-col gap-6 w-full max-w-xl text-center">
        <h1 className="text-2xl font-bold">Ahora podemos personalizarlo</h1>
        <p className="opacity-70">
          Para relacionar lo que estás viviendo con tu carta natal necesitamos tu fecha, hora y lugar de
          nacimiento. Estos datos se utilizan para calcular tu carta. No necesitas proporcionar tu nombre
          completo. Si no conoces tu hora exacta, podrás continuar igualmente con una experiencia más
          limitada.
        </p>
        <p className="text-sm opacity-60">
          Utilizaremos los datos que proporciones para calcular la información astrológica necesaria y
          generar esta experiencia de prueba. Puedes abandonar el proceso en cualquier momento.
        </p>
        <button type="button" className="btn btn-primary" onClick={handleIntroContinue}>
          Añadir mis datos
        </button>
      </div>
    );
  }

  if (subStep === "date") {
    return (
      <div className="flex flex-col gap-6 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center">¿Cuál es tu fecha de nacimiento?</h1>
        <input
          type="date"
          className="input input-bordered w-full"
          value={birthDate}
          onChange={(event) => setBirthDate(event.target.value)}
          max={new Date().toISOString().slice(0, 10)}
        />
        {dateError && <p className="text-error text-sm">{dateError}</p>}
        <button type="button" className="btn btn-primary" onClick={handleDateContinue}>
          Continuar
        </button>
      </div>
    );
  }

  if (subStep === "time") {
    return (
      <div className="flex flex-col gap-6 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center">¿A qué hora naciste?</h1>
        <p className="text-center opacity-70">La hora permite calcular elementos como el Ascendente y las casas.</p>
        <input
          type="time"
          className="input input-bordered w-full"
          value={birthTime}
          onChange={(event) => setBirthTime(event.target.value)}
        />
        {timeError && <p className="text-error text-sm">{timeError}</p>}
        <button type="button" className="btn btn-primary" onClick={() => handleTimeContinue(true)}>
          Continuar
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => handleTimeContinue(false)}>
          No conozco mi hora
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-sm">
      <h1 className="text-2xl font-bold text-center">¿Dónde naciste?</h1>
      <PlaceAutocomplete label="Ciudad de nacimiento" selectedPlace={place} onSelect={setPlace} />
      {submitError && <p className="text-error text-sm">{submitError}</p>}
      <button type="button" className="btn btn-primary" disabled={!place || submitting} onClick={handleSubmit}>
        {submitting ? "Guardando..." : "Crear mi primera lectura"}
      </button>
    </div>
  );
}
