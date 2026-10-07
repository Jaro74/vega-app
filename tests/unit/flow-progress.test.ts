import { describe, expect, it } from "vitest";

import { isOnboardingComplete, resolveNextStep } from "@/libs/experiment/flow-progress";

describe("resolveNextStep", () => {
  it("sin ningun paso completado, el siguiente paso es 'problem' (A y B)", () => {
    expect(resolveNextStep("A", null)).toBe("problem");
    expect(resolveNextStep("B", null)).toBe("problem");
  });

  it("tras 'problem_text', el siguiente paso es 'own_profile_intro' (A y B)", () => {
    expect(resolveNextStep("A", "problem_text")).toBe("own_profile_intro");
    expect(resolveNextStep("B", "problem_text")).toBe("own_profile_intro");
  });

  it("segmento A: tras 'birth_place' el onboarding esta completo (siguiente paso 'preview')", () => {
    expect(resolveNextStep("A", "birth_place")).toBe("preview");
  });

  it("segmento B: tras 'birth_place' el siguiente paso es 'partner_intro'", () => {
    expect(resolveNextStep("B", "birth_place")).toBe("partner_intro");
  });

  it("segmento B: tras 'partner_data' el onboarding esta completo (siguiente paso 'preview')", () => {
    expect(resolveNextStep("B", "partner_data")).toBe("preview");
  });

  // Sprint 4: recorrido comercial. "preview" pasa a escribirse de verdad
  // (POST /api/preview/complete) y avanza al paywall; "paywall" en si
  // nunca se escribe como currentStep (solo es el valor que esta funcion
  // devuelve), igual que ya pasaba con "preview" antes de Sprint 4.
  it("tras 'preview' (preview_completion confirmado), el siguiente paso es 'paywall' (A y B)", () => {
    expect(resolveNextStep("A", "preview")).toBe("paywall");
    expect(resolveNextStep("B", "preview")).toBe("paywall");
  });

  it("tras 'access_intent' (priced_access_intent confirmado), el siguiente paso es 'waitlist'", () => {
    expect(resolveNextStep("A", "access_intent")).toBe("waitlist");
    expect(resolveNextStep("B", "access_intent")).toBe("waitlist");
  });

  it("tras 'waitlist' (waitlist_submit confirmado), es terminal: se devuelve 'waitlist' de nuevo", () => {
    expect(resolveNextStep("A", "waitlist")).toBe("waitlist");
    expect(resolveNextStep("B", "waitlist")).toBe("waitlist");
  });
});

describe("isOnboardingComplete", () => {
  it("es false cuando no hay ningun paso completado", () => {
    expect(isOnboardingComplete("A", null)).toBe(false);
    expect(isOnboardingComplete("B", null)).toBe(false);
  });

  it("A: es true justo tras 'birth_place', sin esperar datos de partner", () => {
    expect(isOnboardingComplete("A", "birth_place")).toBe(true);
  });

  it("B: NO es true tras 'birth_place' (todavia falta partner_data)", () => {
    expect(isOnboardingComplete("B", "birth_place")).toBe(false);
  });

  it("B: es true tras 'partner_data'", () => {
    expect(isOnboardingComplete("B", "partner_data")).toBe(true);
  });
});
