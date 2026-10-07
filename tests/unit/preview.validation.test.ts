import { describe, expect, it } from "vitest";

import { validatePreviewAgainstAllowedEvidence } from "@/libs/validation/preview";
import type { PreviewV1Output } from "@/types/preview";

const allowedEvidenceIds = ["ev_001", "ev_002"];

function buildOutput(overrides: Partial<PreviewV1Output> = {}): PreviewV1Output {
  return {
    mainInsight: "Insight de prueba con suficiente longitud para el test.",
    evidence: [
      { id: "ev_001", label: "Factor 1" },
      { id: "ev_002", label: "Factor 2" },
    ],
    contextualInterpretation: "Interpretacion contextual de prueba.",
    limitation: "Limitacion de prueba.",
    openQuestion: "¿Pregunta abierta de prueba?",
    safetyFlags: [],
    unsupportedClaims: [],
    insufficientEvidence: false,
    ...overrides,
  };
}

describe("validatePreviewAgainstAllowedEvidence", () => {
  it("acepta una preview con exactamente dos evidencias permitidas", () => {
    const result = validatePreviewAgainstAllowedEvidence(buildOutput(), allowedEvidenceIds);
    expect(result.valid).toBe(true);
  });

  it("rechaza una evidencia alucinada que no esta en allowed_evidence", () => {
    const output = buildOutput({
      evidence: [
        { id: "ev_001", label: "Factor 1" },
        { id: "ev_999_inventado", label: "Factor inventado" },
      ],
    });
    const result = validatePreviewAgainstAllowedEvidence(output, allowedEvidenceIds);
    expect(result.valid).toBe(false);
    expect(result.errorType).toBe("unsupported_evidence");
  });

  it("rechaza cuando hay unsupported_claims", () => {
    const output = buildOutput({ unsupportedClaims: ["afirmacion sin respaldo"] });
    const result = validatePreviewAgainstAllowedEvidence(output, allowedEvidenceIds);
    expect(result.valid).toBe(false);
    expect(result.errorType).toBe("unsupported_evidence");
  });

  it("rechaza cualquier safety flag (politica estricta del experimento)", () => {
    const output = buildOutput({ safetyFlags: ["determinismo"] });
    const result = validatePreviewAgainstAllowedEvidence(output, allowedEvidenceIds);
    expect(result.valid).toBe(false);
    expect(result.errorType).toBe("safety_failure");
  });
});
