"use client";

import { useEffect, useRef, useState } from "react";

import type {
  ApiErrorResponse,
  PrivacyDeleteAllResponse,
  PrivacyDeleteWaitlistResponse,
  PrivacySummaryResponse,
  PrivacyWithdrawFreeTextConsentResponse,
} from "@/types/api";

type LoadStatus = "loading" | "unauthenticated" | "ready" | "deleted";

// Pagina de ejercicio de derechos para la beta de Vega. Deliberadamente
// NO se presenta como el cumplimiento definitivo del derecho de acceso
// del RGPD -- ver el comentario extenso en types/api.ts
// (PrivacySummaryResponse): su suficiencia juridica como mecanismo de
// ejercicio de ese derecho queda pendiente de asesoria externa.
//
// Sin sesion activa (caso normal mientras EXPERIMENT_ACCEPTING_REAL_TRAFFIC
// este en false: solo el trafico ?test=1 tiene sesion), se dirige al
// canal manual. No esta enlazada todavia desde la politica de privacidad
// publica -- solo accesible por URL directa.
export default function MisDatosPage() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [summary, setSummary] = useState<PrivacySummaryResponse | null>(null);
  const [deleteAllResult, setDeleteAllResult] = useState<PrivacyDeleteAllResponse | null>(null);

  const fetchSummary = () => {
    setStatus("loading");
    fetch("/api/privacy/summary")
      .then(async (response) => {
        if (!response.ok) {
          setStatus("unauthenticated");
          return;
        }
        const data = (await response.json()) as PrivacySummaryResponse;
        setSummary(data);
        setStatus("ready");
      })
      .catch(() => setStatus("unauthenticated"));
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">Tus datos en Vega</h1>
          <p className="opacity-70">
            No hemos podido identificar una sesión activa en este navegador. Esto es normal si no has
            explorado Vega recientemente desde aquí, o si tu navegador no conserva la sesión.
          </p>
          <p className="opacity-70">
            El canal específico de privacidad de la sociedad responsable se habilitará aquí antes de abrir
            tráfico real.
          </p>
        </div>
      </main>
    );
  }

  if (status === "deleted" && deleteAllResult) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">Tus datos han sido eliminados</h1>
          <p className="opacity-70">
            Se han borrado los datos de exploración de {deleteAllResult.flowAttemptsAffected}{" "}
            {deleteAllResult.flowAttemptsAffected === 1 ? "intento" : "intentos"}
            {deleteAllResult.waitlistEntryDeleted ? ", incluida tu entrada en la lista de espera" : ""}.
          </p>
          <p className="opacity-70">
            Si vuelves a usar Vega más adelante, empezarás con una sesión nueva. El canal específico de
            privacidad de la sociedad responsable se habilitará aquí antes de abrir tráfico real.
          </p>
        </div>
      </main>
    );
  }

  if (!summary) return null;

  const hasWaitlistEntry = summary.flowAttempts.some((attempt) => attempt.waitlistEntry !== null);
  const waitlistEmail = summary.flowAttempts.find((attempt) => attempt.waitlistEntry !== null)?.waitlistEntry
    ?.email;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-10 px-4 py-16">
      <div className="max-w-xl w-full space-y-6">
        <h1 className="text-2xl font-bold text-center">Tus datos en Vega</h1>
        <p className="opacity-70 text-center text-sm">
          Resumen de los datos asociados a tu sesión actual. Esto no sustituye ni agota tus derechos en
          materia de protección de datos.
        </p>

        <div className="space-y-3">
          {summary.flowAttempts.length === 0 && (
            <p className="opacity-70 text-center">Todavía no hay ningún intento de exploración asociado.</p>
          )}
          {summary.flowAttempts.map((attempt) => (
            <div key={attempt.flowAttemptId} className="border rounded-lg p-4 text-sm space-y-1">
              <p className="font-semibold">
                Intento {attempt.isPrimaryAttempt ? "principal" : "secundario"} — segmento {attempt.segment}
              </p>
              <p className="opacity-70">Iniciado el {new Date(attempt.startedAt).toLocaleDateString()}</p>
              {attempt.hasProblemContext && <p>Tienes un motivo de exploración guardado.</p>}
              {attempt.hasPartnerInputPending && <p>Hay datos de otra persona pendientes de procesar.</p>}
              {attempt.hasPartnerDerivedProfile && <p>Existe un resultado derivado sobre otra persona.</p>}
              {attempt.hasValidPreview && <p>Se generó una lectura (preview) para este intento.</p>}
              {attempt.hasPricedAccessIntent && <p>Confirmaste una intención de acceso de pago (prueba, sin cobro real).</p>}
              {attempt.waitlistEntry && (
                <p>Entrada en lista de espera con el email: {attempt.waitlistEntry.email}</p>
              )}
              {attempt.hasFreeTextConsent && (
                <WithdrawFreeTextConsentButton flowAttemptId={attempt.flowAttemptId} onWithdrawn={fetchSummary} />
              )}
            </div>
          ))}
          {summary.hasOwnBirthProfile && (
            <p className="text-sm text-center opacity-70">Tienes un perfil de nacimiento propio guardado.</p>
          )}
        </div>

        <div className="divider" />

        <div className="flex flex-col gap-4 items-center">
          {hasWaitlistEntry && (
            <DeleteWaitlistButton email={waitlistEmail ?? null} onDeleted={fetchSummary} />
          )}
          <DeleteAllButton onDeleted={(result) => { setDeleteAllResult(result); setStatus("deleted"); }} />
        </div>

        <p className="opacity-70 text-center text-xs">
          El canal específico de privacidad de la sociedad responsable se habilitará aquí antes de abrir
          tráfico real.
        </p>
      </div>
    </main>
  );
}

// Confirmacion en dos pasos (mismo patron que PaywallStep: oferta ->
// confirmacion explicita), porque borrar todos los datos invalida la
// sesion actual.
function DeleteAllButton({ onDeleted }: { onDeleted: (result: PrivacyDeleteAllResponse) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const submittingRef = useRef(false);

  const handleConfirm = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(false);
    try {
      const response = await fetch("/api/privacy/delete-all", { method: "POST" });
      const body = (await response.json()) as PrivacyDeleteAllResponse | ApiErrorResponse;
      if (!response.ok || !("ok" in body) || !body.ok) throw new Error("borrado no confirmado");
      onDeleted(body);
    } catch {
      setError(true);
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  if (!confirming) {
    return (
      <button type="button" className="btn btn-outline btn-error" onClick={() => setConfirming(true)}>
        Borrar todos mis datos
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 items-center">
      <p className="text-sm text-center opacity-80 max-w-sm">
        Esto borrará tus datos de exploración y tu entrada en la lista de espera si la tienes, y cerrará tu
        sesión actual. Si vuelves más adelante, empezarás de nuevo.
      </p>
      {error && (
        <p className="text-sm text-error" role="alert">
          No hemos podido completar el borrado. Puedes volver a intentarlo.
        </p>
      )}
      <button type="button" className="btn btn-error" disabled={submitting} onClick={handleConfirm}>
        {submitting ? "Borrando..." : "Sí, borrar todos mis datos"}
      </button>
    </div>
  );
}

function DeleteWaitlistButton({ email, onDeleted }: { email: string | null; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const submittingRef = useRef(false);

  const handleConfirm = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(false);
    try {
      const response = await fetch("/api/privacy/delete-waitlist", { method: "POST" });
      const body = (await response.json()) as PrivacyDeleteWaitlistResponse | ApiErrorResponse;
      if (!response.ok || !("ok" in body) || !body.ok) throw new Error("borrado no confirmado");
      onDeleted();
    } catch {
      setError(true);
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  if (!confirming) {
    return (
      <button type="button" className="btn btn-outline" onClick={() => setConfirming(true)}>
        Borrar solo mi entrada de la lista de espera{email ? ` (${email})` : ""}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 items-center">
      <p className="text-sm text-center opacity-80 max-w-sm">
        Esto borrará únicamente tu entrada en la lista de espera. El resto de tus datos y tu sesión actual
        no se verán afectados.
      </p>
      {error && (
        <p className="text-sm text-error" role="alert">
          No hemos podido completar el borrado. Puedes volver a intentarlo.
        </p>
      )}
      <button type="button" className="btn btn-primary" disabled={submitting} onClick={handleConfirm}>
        {submitting ? "Borrando..." : "Sí, borrar solo mi entrada de la lista de espera"}
      </button>
    </div>
  );
}

// Retira unicamente el consentimiento del texto libre de ESTE intento
// (POST /api/privacy/withdraw-free-text-consent) -- distinto de
// DeleteWaitlistButton/DeleteAllButton, es por flow_attempt_id, no por
// sesion, porque un usuario puede tener varios intentos con free_text
// independientes.
function WithdrawFreeTextConsentButton({
  flowAttemptId,
  onWithdrawn,
}: {
  flowAttemptId: string;
  onWithdrawn: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const submittingRef = useRef(false);

  const handleConfirm = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(false);
    try {
      const response = await fetch("/api/privacy/withdraw-free-text-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flowAttemptId }),
      });
      const body = (await response.json()) as PrivacyWithdrawFreeTextConsentResponse | ApiErrorResponse;
      if (!response.ok || !("ok" in body) || !body.ok) throw new Error("retirada no confirmada");
      onWithdrawn();
    } catch {
      setError(true);
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  if (!confirming) {
    return (
      <button type="button" className="btn btn-outline btn-sm" onClick={() => setConfirming(true)}>
        Retirar el consentimiento de este texto
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 items-start">
      <p className="text-sm opacity-80 max-w-sm">
        Puedes retirar este consentimiento cuando quieras. Al hacerlo, borraremos el texto que escribiste y
        cualquier interpretación que lo haya utilizado — el resto de tus datos no se verá afectado.
      </p>
      {error && (
        <p className="text-sm text-error" role="alert">
          No hemos podido completar la retirada. Puedes volver a intentarlo.
        </p>
      )}
      <button type="button" className="btn btn-primary btn-sm" disabled={submitting} onClick={handleConfirm}>
        {submitting ? "Retirando..." : "Sí, retirar el consentimiento de este texto"}
      </button>
    </div>
  );
}
