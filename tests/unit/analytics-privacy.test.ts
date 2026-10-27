import { describe, expect, it } from "vitest";

import { SPRINT1_EVENT_NAMES, SPRINT2_EVENT_NAMES } from "@/libs/experiment/constants";
import {
  assertNoForbiddenProperties,
  captureExperimentEvent,
  type Sprint1EventProperties,
} from "@/libs/analytics/events";

const baseProperties: Sprint1EventProperties = {
  anonymousUserId: "11111111-1111-1111-1111-111111111111",
  sessionId: "session-1",
  segment: "A" as const,
  isPrimaryAttempt: true,
  isTest: false,
  trafficSource: "direct",
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmContent: null,
  placement: null,
  deviceType: "desktop",
};

describe("assertNoForbiddenProperties", () => {
  it("no lanza con las propiedades permitidas del catalogo Sprint 1", () => {
    expect(() => assertNoForbiddenProperties({ ...baseProperties })).not.toThrow();
  });

  it.each([
    "email",
    "birthDate",
    "birth_time",
    "birthPlace",
    "placeLabel",
    "latitude",
    "longitude",
    "freeText",
    "problemText",
    "partnerBirthDate",
    "relationshipFocus",
    "userEmotionalState",
    "impactIntensity",
  ])("rechaza una propiedad prohibida: %s", (forbiddenKey) => {
    expect(() =>
      assertNoForbiddenProperties({ ...baseProperties, [forbiddenKey]: "valor-sensible" })
    ).toThrow(/no permitidas/);
  });

  it("captureExperimentEvent nunca envia (silenciosamente) propiedades prohibidas: lanza en vez de enviarlas", () => {
    expect(() =>
      captureExperimentEvent("neutral_landing_view", {
        ...baseProperties,
        // @ts-expect-error solo para probar el guardarraíl en runtime
        email: "usuario@example.com",
      })
    ).toThrow(/no permitidas/);
  });

  // Regresion especifica: el contexto estructurado de Segmento B
  // (decision de producto post-LIA) nunca debe llegar a PostHog, ni
  // siquiera si problem_complete volviera a adjuntarlo por error.
  it("captureExperimentEvent rechaza el contexto estructurado de Segmento B si problem_complete volviera a incluirlo", () => {
    expect(() =>
      captureExperimentEvent("problem_complete", {
        ...baseProperties,
        trigger: "career",
        // @ts-expect-error solo para probar el guardarraíl en runtime -- TS ya
        // rechaza el literal entero por la primera propiedad desconocida
        relationshipFocus: "communication",
        userEmotionalState: "confused",
        impactIntensity: 3,
      })
    ).toThrow(/no permitidas/);
  });

  it("permite problem_complete con solo trigger (comportamiento sin cambios)", () => {
    expect(() =>
      assertNoForbiddenProperties({ ...baseProperties, trigger: "career" })
    ).not.toThrow();
  });
});

describe("SPRINT1_EVENT_NAMES", () => {
  it("contiene exactamente los cuatro eventos de Sprint 1, en el orden del catalogo", () => {
    expect(SPRINT1_EVENT_NAMES).toEqual([
      "neutral_landing_view",
      "router_view",
      "segment_selected",
      "segment_entry",
    ]);
  });
});

describe("SPRINT2_EVENT_NAMES", () => {
  it("contiene exactamente los 16 eventos de onboarding del encargo de Sprint 2", () => {
    expect(SPRINT2_EVENT_NAMES).toEqual([
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
    ]);
  });
});

// Propiedades del catalogo congelado (types/analytics.ts) que colisionan
// por substring con la lista de prohibidas (ej. "birthDateValid" contiene
// "birthdate") sin ser el dato sensible: deben seguir permitidas.
describe("assertNoForbiddenProperties - excepciones de Sprint 2", () => {
  it.each([
    { birthDateValid: true },
    { birthTimeKnown: true },
    { birthTimeKnown: false },
    { birthPlaceValid: true },
    { problemTextProvided: true },
    { problemTextProvided: false },
  ])("permite la propiedad aprobada %o", (extra) => {
    expect(() => assertNoForbiddenProperties({ ...baseProperties, ...extra })).not.toThrow();
  });

  it("sigue rechazando el dato bruto real aunque exista una excepcion con nombre parecido", () => {
    expect(() =>
      assertNoForbiddenProperties({ ...baseProperties, birthDate: "1990-01-01" })
    ).toThrow(/no permitidas/);
    expect(() => assertNoForbiddenProperties({ ...baseProperties, birthTime: "10:00" })).toThrow(
      /no permitidas/
    );
    expect(() =>
      assertNoForbiddenProperties({ ...baseProperties, problemText: "texto sensible" })
    ).toThrow(/no permitidas/);
  });
});
