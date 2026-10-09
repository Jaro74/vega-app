import { EVENT_NAMES } from "@/types/analytics";
import { TRIGGERS_A, TRIGGERS_B } from "@/types/experiment";

export const EXPERIMENT_ID = "vega_beachhead_v1" as const;

// Suspension tecnica conservadora del trafico real (no ?test=1/vega_test)
// mientras el responsable del tratamiento no este constituido y
// /privacy-policy siga mostrando contenido ajeno a Vega. Activada deliberada
// y explicitamente en false: se vuelve a true cuando ambos problemas esten
// resueltos. Comprobada en middleware.ts, GET /api/session, POST
// /api/segment, components/experiment/ExperimentBootstrap.tsx y
// app/explorar/page.tsx; libs/analytics/posthog-client.ts la usa para
// apagar PostHog por completo mientras este en false (sin excepcion para
// trafico de test, salvo el bypass E2E exclusivo de privacy.spec.ts).
export const EXPERIMENT_ACCEPTING_REAL_TRAFFIC = false;

export const EXPERIMENT_SUSPENDED_MESSAGE =
  "De momento no podemos ofrecer el experimento a nuevos visitantes. Vuelve pronto.";

export const PARTNER_INPUT_EXPIRY_HOURS = 24;

export const PRICED_ACCESS = {
  priceMinor: 999,
  currency: "EUR",
} as const;

// Sprint 4: version de la finalidad concreta y unica que cubre el
// consentimiento de la waitlist ("avisar cuando Vega abra acceso a la
// beta"). No cubre marketing ni ninguna otra comunicacion -- si en el
// futuro se pide consentimiento para eso, sera una constante y una columna
// distintas, nunca esta misma reutilizada. Si el texto visible del
// checkbox cambia de forma material, esta constante sube de version
// (p.ej. "waitlist_consent_v2") para que las filas ya guardadas queden
// trazadas con lo que realmente aceptaron.
export const WAITLIST_CONSENT_VERSION = "waitlist_consent_v1" as const;

export const FREE_TEXT_MAX_LENGTH = 1000;

// Version del aviso + checkbox de consentimiento especifico del texto
// libre de problem_context (art. 6.1.a / 9.2.a cuando proceda). Debe
// coincidir exactamente con la fila 'v2' de free_text_consent_versions
// (supabase/migrations/20260111000000_free_text_consent_v2.sql) -- si
// el texto visible cambia de forma material, esta constante sube de
// version (p.ej. "v3") y se inserta una nueva fila, nunca se reutiliza
// una version existente para un contenido distinto.
//
// Subida de "v1" a "v2" el 2026-10-10: el filtro/aviso/checkbox
// cambiaron de prohibicion-por-categoria a minimizacion de
// identificadores directos (ver documentacion/VEGA_Consentimiento_
// FreeText_v1.md, seccion 2/5). Los eventos 'granted' ya registrados
// bajo 'v1' siguen siendo una prueba de consentimiento valida para el
// texto que realmente se mostro entonces -- no se reescriben ni se
// invalidan; solo los grants NUEVOS a partir de este cambio se
// registran como 'v2'.
export const FREE_TEXT_CONSENT_VERSION = "v2" as const;

export const OPEN_QUESTIONS = {
  A: "¿Quieres explorar primero por qué este patrón parece repetirse o qué está especialmente activo ahora?",
  B: "¿Quieres explorar primero qué os conecta o qué ocurre cuando aparece tensión entre vosotros?",
} as const;

// Sprint 1 solo implementa estos cuatro eventos del catalogo completo de
// EVENT_NAMES (VEGA_Fase_4C, seccion Q). El resto existe ya en el tipo
// pero no debe dispararse todavia (seccion 11 del encargo de Sprint 1).
export const SPRINT1_EVENT_NAMES = [
  "neutral_landing_view",
  "router_view",
  "segment_selected",
  "segment_entry",
] as const;

export type Sprint1EventName = (typeof SPRINT1_EVENT_NAMES)[number];

// Sprint 2 implementa el onboarding completo hasta onboarding_complete
// (encargo de Sprint 2, seccion "Eventos PostHog del Sprint 2"). El resto
// del catalogo (preview_*, paywall_view, priced_*, waitlist_submit)
// existe ya en EVENT_NAMES pero no debe dispararse todavia.
export const SPRINT2_EVENT_NAMES = [
  "problem_selected",
  "problem_text_added",
  "problem_complete",
  "onboarding_start",
  "own_profile_start",
  "birth_date_added",
  "birth_time_added",
  "birth_time_unknown",
  "birth_place_added",
  "own_profile_complete",
  "partner_data_start",
  "partner_full_data",
  "partner_partial_data",
  "partner_minimal_data",
  "partner_analysis_possible",
  "onboarding_complete",
] as const;

export type Sprint2EventName = (typeof SPRINT2_EVENT_NAMES)[number];

// Sprint 3A implementa la generacion de preview para el segmento A
// (encargo Sprint 3A, "Eventos Sprint 3A"). paywall_view, priced_*,
// waitlist_submit siguen sin implementarse (Sprint 4).
export const SPRINT3A_EVENT_NAMES = [
  "preview_generation_start",
  "preview_generation_error",
  "preview_view",
  "preview_completion",
] as const;

export type Sprint3AEventName = (typeof SPRINT3A_EVENT_NAMES)[number];

// Sprint 3B: sinastria real para segmento B. Reutiliza los cuatro eventos
// de preview de Sprint 3A (mismo significado, ahora tambien para B) mas
// partner_analysis_not_viable, aprobado explicitamente para cubrir el
// hueco de medicion de "insufficient_data" (ver types/analytics.ts).
export const SPRINT3B_EVENT_NAMES = ["partner_analysis_not_viable"] as const;

export type Sprint3BEventName = (typeof SPRINT3B_EVENT_NAMES)[number];

// Sprint 4 implementa el recorrido comercial (fake door): paywall,
// confirmacion de intencion de pago y waitlist (encargo Sprint 4,
// "Objetivo de Sprint 4"). Ultimos 4 eventos del catalogo congelado.
export const SPRINT4_EVENT_NAMES = [
  "paywall_view",
  "priced_cta_click",
  "priced_access_intent",
  "waitlist_submit",
] as const;

export type Sprint4EventName = (typeof SPRINT4_EVENT_NAMES)[number];

export const IMPLEMENTED_EVENT_NAMES = [
  ...SPRINT1_EVENT_NAMES,
  ...SPRINT2_EVENT_NAMES,
  ...SPRINT3A_EVENT_NAMES,
  ...SPRINT3B_EVENT_NAMES,
  ...SPRINT4_EVENT_NAMES,
] as const;

export type ImplementedEventName =
  | Sprint1EventName
  | Sprint2EventName
  | Sprint3AEventName
  | Sprint3BEventName
  | Sprint4EventName;

export { EVENT_NAMES, TRIGGERS_A, TRIGGERS_B };
