import { describe, expect, it } from "vitest";

import { isTriggerValidForSegment, problemRequestSchema } from "@/libs/validation/problem";
import { FREE_TEXT_MAX_LENGTH } from "@/libs/experiment/constants";

const baseInput = {
  flowAttemptId: "8c9c7d2e-4c1b-4b8a-8c1a-1a2b3c4d5e6f",
  trigger: "career",
};

describe("problemRequestSchema", () => {
  it("acepta un trigger de A sin texto libre (opcional)", () => {
    const result = problemRequestSchema.safeParse(baseInput);
    expect(result.success).toBe(true);
  });

  it("acepta un trigger de B", () => {
    const result = problemRequestSchema.safeParse({ ...baseInput, trigger: "breakup" });
    expect(result.success).toBe(true);
  });

  it("acepta texto libre dentro del limite", () => {
    const result = problemRequestSchema.safeParse({ ...baseInput, freeText: "Un texto corto" });
    expect(result.success).toBe(true);
  });

  it("rechaza texto libre por encima de 1000 caracteres", () => {
    const result = problemRequestSchema.safeParse({
      ...baseInput,
      freeText: "a".repeat(FREE_TEXT_MAX_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("acepta exactamente 1000 caracteres", () => {
    const result = problemRequestSchema.safeParse({
      ...baseInput,
      freeText: "a".repeat(FREE_TEXT_MAX_LENGTH),
    });
    expect(result.success).toBe(true);
  });

  it("rechaza un trigger que no pertenece a ningun catalogo", () => {
    const result = problemRequestSchema.safeParse({ ...baseInput, trigger: "no_existe" });
    expect(result.success).toBe(false);
  });

  it("rechaza un flowAttemptId que no es UUID", () => {
    const result = problemRequestSchema.safeParse({ ...baseInput, flowAttemptId: "no-es-un-uuid" });
    expect(result.success).toBe(false);
  });

  // Contexto estructurado de Segmento B (encargo "eliminar free_text de
  // Segmento B"). El schema solo valida FORMA -- que relationshipFocus/
  // userEmotionalState/impactIntensity sean exclusivos de B (y freeText*
  // exclusivo de A) es una regla de negocio, aplicada en submitProblem.
  it("acepta los 6 valores de relationshipFocus", () => {
    const values = [
      "communication",
      "emotional_closeness",
      "trust_security",
      "current_change",
      "repeating_pattern",
      "navigating_relationship",
    ];
    values.forEach((relationshipFocus) => {
      const result = problemRequestSchema.safeParse({ ...baseInput, relationshipFocus });
      expect(result.success).toBe(true);
    });
  });

  it("rechaza un relationshipFocus fuera del catalogo (p.ej. 'conflict', eliminado por duplicar trigger)", () => {
    const result = problemRequestSchema.safeParse({ ...baseInput, relationshipFocus: "conflict" });
    expect(result.success).toBe(false);
  });

  it("acepta los 8 valores de userEmotionalState", () => {
    const values = ["confused", "insecure", "distant", "frustrated", "blocked", "hopeful", "calm", "curious"];
    values.forEach((userEmotionalState) => {
      const result = problemRequestSchema.safeParse({ ...baseInput, userEmotionalState });
      expect(result.success).toBe(true);
    });
  });

  it("rechaza un userEmotionalState fuera del catalogo", () => {
    const result = problemRequestSchema.safeParse({ ...baseInput, userEmotionalState: "anxious" });
    expect(result.success).toBe(false);
  });

  it("acepta impactIntensity de 1 a 5", () => {
    [1, 2, 3, 4, 5].forEach((impactIntensity) => {
      const result = problemRequestSchema.safeParse({ ...baseInput, impactIntensity });
      expect(result.success).toBe(true);
    });
  });

  it("rechaza impactIntensity fuera de 1..5", () => {
    expect(problemRequestSchema.safeParse({ ...baseInput, impactIntensity: 0 }).success).toBe(false);
    expect(problemRequestSchema.safeParse({ ...baseInput, impactIntensity: 6 }).success).toBe(false);
    expect(problemRequestSchema.safeParse({ ...baseInput, impactIntensity: 3.5 }).success).toBe(false);
  });

  it("acepta trigger + freeText (A) y relationshipFocus/userEmotionalState/impactIntensity (B) a nivel de forma simultaneamente -- el rechazo cruzado es una regla de negocio, no de este schema", () => {
    const result = problemRequestSchema.safeParse({
      ...baseInput,
      freeText: "texto",
      relationshipFocus: "communication",
    });
    expect(result.success).toBe(true);
  });
});

describe("isTriggerValidForSegment", () => {
  it("acepta los 8 triggers de A para el segmento A", () => {
    const triggersA = [
      "career",
      "blocked",
      "major_change",
      "identity",
      "family",
      "repeating_pattern",
      "relationship_spillover",
      "other",
    ];
    triggersA.forEach((trigger) => expect(isTriggerValidForSegment("A", trigger)).toBe(true));
  });

  it("acepta los 8 triggers de B para el segmento B", () => {
    const triggersB = ["new_connection", "relationship", "conflict", "distance", "breakup", "ex", "on_off", "other"];
    triggersB.forEach((trigger) => expect(isTriggerValidForSegment("B", trigger)).toBe(true));
  });

  it("rechaza un trigger de B para el segmento A", () => {
    expect(isTriggerValidForSegment("A", "breakup")).toBe(false);
  });

  it("rechaza un trigger de A para el segmento B", () => {
    expect(isTriggerValidForSegment("B", "career")).toBe(false);
  });
});
