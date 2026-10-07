import { EXPERIMENT_ID, type ImplementedEventName } from "@/libs/experiment/constants";
import type { PartnerPrecision, Segment, Trigger } from "@/types/experiment";
import type { PreviewGenerationErrorType } from "@/types/preview";

import { getExperimentReadyPromise } from "./experiment-ready";
import { initPostHog } from "./posthog-client";

// Nombre historico de Sprint 1: se mantiene igual (solo se le AÑADEN
// campos opcionales) porque tests/unit/analytics-privacy.test.ts importa
// este tipo por nombre y construye un objeto literal con los 8 campos
// originales. Añadir campos opcionales no rompe ese contrato.
export interface Sprint1EventProperties {
  anonymousUserId: string | null;
  sessionId: string;
  segment: Segment | null;
  isPrimaryAttempt: boolean | null;
  isTest: boolean;
  trafficSource: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  placement: string | null;
  deviceType: string | null;
  // Sprint 2: comunes adicionales (trigger, partnerPrecision) mas las
  // propiedades especificas por evento del catalogo congelado
  // (types/analytics.ts). Todas opcionales porque cada evento solo usa
  // el subconjunto que le corresponde.
  trigger?: Trigger | null;
  partnerPrecision?: PartnerPrecision | null;
  problemTextProvided?: boolean;
  characterCount?: number;
  birthDateValid?: true;
  birthTimeKnown?: boolean;
  birthPlaceValid?: true;
  ownProfilePrecision?: "full" | "limited";
  // Sprint 3A: unica propiedad especifica de preview_generation_error
  // (VEGA_Fase_4C, bloque J). Nunca lleva contenido de la preview.
  errorType?: PreviewGenerationErrorType;
}

// Lista blanca de claves que jamas deben viajar a PostHog (VEGA_Fase_4C,
// seccion W "NO enviar a PostHog"). Se comprueba por substring en
// minusculas para detectar variantes (birthDate, birth_date,
// partnerBirthDate, etc.) sin tener que enumerarlas todas.
const FORBIDDEN_PROPERTY_SUBSTRINGS = [
  "email",
  "birthdate",
  "birthtime",
  "birthplace",
  "placelabel",
  "latitude",
  "longitude",
  "freetext",
  "problemtext",
  "partnerbirth",
  "partnerdata",
  // Sprint 3B: chart_id_b es una huella de los datos de nacimiento de la
  // segunda persona (contrato de sinastria, VEGA_Resumen_hasta_Sinastria_v1.md);
  // los IDs de evidencia de sinastria la incluyen literalmente
  // (inter_aspect:...:chart_id_a:chart_id_b:...). Ninguno de los dos debe
  // viajar nunca a PostHog (encargo Sprint 3B, seccion 10).
  "chartid",
  "evidenceid",
] as const;

// Excepciones exactas y explicitas: son flags booleanos/contadores del
// catalogo congelado (types/analytics.ts) que colisionan por substring
// con la lista de arriba sin ser el dato sensible en si (ej.
// "birthDateValid" contiene "birthdate" pero es un booleano, nunca la
// fecha). Lista cerrada a proposito: cualquier propiedad nueva que
// contenga un substring prohibido sigue bloqueada por defecto.
const SAFE_PROPERTY_EXCEPTIONS = new Set([
  "birthdatevalid",
  "birthtimeknown",
  "birthplacevalid",
  "problemtextprovided",
]);

export function assertNoForbiddenProperties(properties: Record<string, unknown>): void {
  const offending = Object.keys(properties).filter((key) => {
    // Se quita todo lo que no sea alfanumerico para detectar tanto
    // camelCase (birthDate) como snake_case (birth_date) con la misma
    // lista de substrings.
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (SAFE_PROPERTY_EXCEPTIONS.has(normalized)) return false;
    return FORBIDDEN_PROPERTY_SUBSTRINGS.some((forbidden) => normalized.includes(forbidden));
  });

  if (offending.length > 0) {
    throw new Error(
      `Propiedades de analytics no permitidas: ${offending.join(", ")}. ` +
        "PostHog nunca debe recibir datos personales (VEGA_Fase_4C, seccion W)."
    );
  }
}

// Sincrona, igual que antes: assertNoForbiddenProperties() se sigue
// ejecutando inmediatamente, antes de encolar nada. Solo el envio real a
// PostHog espera a getExperimentReadyPromise() -- el gate central que
// evita que un evento llegue a PostHog antes de que
// ExperimentBootstrap.identify() haya terminado (libs/analytics/experiment-ready.ts).
// Si el bootstrap termina en "blocked" (trafico suspendido, fetch
// fallido, PostHog no disponible), el evento simplemente se descarta.
export function captureExperimentEvent(
  eventName: ImplementedEventName,
  properties: Sprint1EventProperties
): void {
  const fullProperties = { experimentId: EXPERIMENT_ID, ...properties };
  assertNoForbiddenProperties(fullProperties);

  getExperimentReadyPromise().then((ready) => {
    if (!ready) return;
    const posthog = initPostHog();
    posthog?.capture(eventName, fullProperties);
  });
}
