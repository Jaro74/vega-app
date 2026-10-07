// Catalogo congelado de eventos PostHog del experimento.
// Fuente: VEGA_Fase_4C_Especificacion_Final_Experimento.md, seccion Q.
//
// Regla dura: ningun dato personal bruto (fecha, hora, ciudad,
// coordenadas, texto emocional, email, datos de segunda persona,
// outputs astrologicos identificables) puede viajar en las propiedades
// de un evento. Solo flags y categorias.

import type { PartnerPrecision, Segment, Trigger } from "./experiment";
import type { PreviewGenerationErrorType } from "./preview";

export const EVENT_NAMES = [
  "neutral_landing_view",
  "router_view",
  "segment_selected",
  "segment_entry",
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
  // Sprint 3B: no forma parte del catalogo original de Fase 4C, seccion
  // Q. Se anade porque, con la sinastria real, "minimal" siempre resulta
  // en insufficient_data y ese resultado no tenia forma de medirse
  // (preview_generation_error no encaja: no es un error tecnico). Mismas
  // propiedades permitidas que partner_analysis_possible: solo
  // partnerPrecision y comunes, nunca datos de la segunda persona.
  "partner_analysis_not_viable",
  "onboarding_complete",
  "preview_generation_start",
  "preview_generation_error",
  "preview_view",
  "preview_completion",
  "paywall_view",
  "priced_cta_click",
  "priced_access_intent",
  "waitlist_submit",
  "segment_out_of_scope",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export interface CommonEventProperties {
  anonymousUserId: string;
  sessionId: string;
  experimentId: "vega_beachhead_v1";
  segment: Segment | null;
  trigger: Trigger | null;
  partnerPrecision: PartnerPrecision | null;
  trafficSource: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  placement: string | null;
  deviceType: string | null;
  browser: string | null;
  country: string | null;
  timestamp: string;
  appVersion: string;
  isTest: boolean;
}

// Propiedades especificas documentadas por evento. Solo se listan las
// que la especificacion define explicitamente; el resto de eventos usa
// unicamente las CommonEventProperties.
export interface ProblemTextAddedProperties {
  problemTextProvided: boolean;
  characterCount: number;
}

export interface BirthDateAddedProperties {
  birthDateValid: true;
}

export interface BirthTimeProperties {
  birthTimeKnown: boolean;
}

export interface BirthPlaceAddedProperties {
  birthPlaceValid: true;
  ownProfilePrecision: "full" | "limited";
}

export interface PartnerPrecisionProperties {
  partnerPrecision: PartnerPrecision;
}

export interface PreviewGenerationErrorProperties {
  errorType: PreviewGenerationErrorType;
}
