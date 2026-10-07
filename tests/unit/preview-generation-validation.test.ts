import { describe, expect, it } from "vitest";

import { validatePreviewForGeneration } from "@/libs/validation/preview-generation";
import type { PreviewV1Output } from "@/types/preview";
import type { VegaEvidenceItem } from "@/types/vega";

function buildEvidenceItem(overrides: Partial<VegaEvidenceItem> = {}): VegaEvidenceItem {
  return {
    id: "ev_001",
    schemaVersion: "evidence_v1",
    factsVersion: "facts_v1",
    claimsVersion: "claims_v1",
    chartId: "chart-1",
    kind: "planet_position",
    subject: "sun",
    payload: {},
    provenance: { source: "structural_claim" },
    ...overrides,
  };
}

const allowedEvidence: VegaEvidenceItem[] = [
  buildEvidenceItem({ id: "ev_001", kind: "planet_position" }),
  buildEvidenceItem({ id: "ev_002", kind: "aspect" }),
];

const WORDS_46 =
  "En este momento parece haber una tension entre lo que sientes que deberias hacer y lo que " +
  "realmente te esta pidiendo la situacion. Los factores que estamos observando en tu carta " +
  "apuntan a un periodo donde conviene mirar hacia dentro antes de decidir el siguiente paso.";

const WORDS_67 =
  "Relacionando estos factores con lo que nos has contado, tiene sentido que esta situacion te " +
  "resulte especialmente presente ahora mismo, incluso si todavia no consigues ponerle nombre " +
  "del todo. No se trata de un patron fijo, sino de un momento que invita a prestar atencion a " +
  "como estas respondiendo a lo que ocurre a tu alrededor, sin forzar todavia una conclusion " +
  "definitiva sobre lo que vendra despues.";

function buildOutput(overrides: Partial<PreviewV1Output> = {}): PreviewV1Output {
  return {
    mainInsight: WORDS_46,
    evidence: [
      { id: "ev_001", label: "Factor 1", interpretationScope: "contexto" },
      { id: "ev_002", label: "Factor 2", interpretationScope: "contexto" },
    ],
    contextualInterpretation: WORDS_67,
    limitation: "Limitacion de prueba.",
    openQuestion: "¿Pregunta abierta?",
    safetyFlags: [],
    unsupportedClaims: [],
    insufficientEvidence: false,
    ...overrides,
  };
}

describe("validatePreviewForGeneration", () => {
  it("acepta una preview valida con time_known=true", () => {
    const result = validatePreviewForGeneration(buildOutput(), allowedEvidence, true);
    expect(result.valid).toBe(true);
  });

  it("rechaza un main_insight demasiado corto", () => {
    const result = validatePreviewForGeneration(buildOutput({ mainInsight: "Muy corto." }), allowedEvidence, true);
    expect(result.valid).toBe(false);
    expect(result.errorType).toBe("schema_invalid");
  });

  it("rechaza una contextual_interpretation demasiado larga", () => {
    const tooLong = `${WORDS_67} ${WORDS_67} ${WORDS_67}`;
    const result = validatePreviewForGeneration(
      buildOutput({ contextualInterpretation: tooLong }),
      allowedEvidence,
      true
    );
    expect(result.valid).toBe(false);
    expect(result.errorType).toBe("schema_invalid");
  });

  it("rechaza si una evidencia usada depende de hora (kind=house) y time_known=false", () => {
    const evidenceWithHouse = [allowedEvidence[0]!, buildEvidenceItem({ id: "ev_002", kind: "house_cusp" })];
    const output = buildOutput({
      evidence: [
        { id: "ev_001", label: "Factor 1", interpretationScope: "contexto" },
        { id: "ev_002", label: "Factor 2 (casa)", interpretationScope: "contexto" },
      ],
    });
    const result = validatePreviewForGeneration(output, evidenceWithHouse, false);
    expect(result.valid).toBe(false);
    expect(result.errorType).toBe("unsupported_evidence");
  });

  it("rechaza si el texto menciona 'Ascendente' aunque time_known=false y las evidencias usadas no dependan de hora", () => {
    const output = buildOutput({
      mainInsight: `${WORDS_46} Esto se relaciona con tu Ascendente.`,
    });
    const result = validatePreviewForGeneration(output, allowedEvidence, false);
    expect(result.valid).toBe(false);
    expect(result.errorType).toBe("unsupported_evidence");
  });

  it("acepta la limitacion aprobada que menciona 'casas' y 'Ascendente' para EXPLICAR su ausencia (time_known=false)", () => {
    const output = buildOutput({
      limitation:
        "Como no conocemos tu hora de nacimiento, Vega no está utilizando casas ni Ascendente en esta lectura.",
    });
    const result = validatePreviewForGeneration(output, allowedEvidence, false);
    expect(result.valid).toBe(true);
  });

  it("rechaza un ID de evidencia inventado (no delega la comprobacion base)", () => {
    const output = buildOutput({
      evidence: [
        { id: "ev_001", label: "Factor 1", interpretationScope: "contexto" },
        { id: "ev_999_inventado", label: "Factor inventado", interpretationScope: "contexto" },
      ],
    });
    const result = validatePreviewForGeneration(output, allowedEvidence, true);
    expect(result.valid).toBe(false);
    expect(result.errorType).toBe("unsupported_evidence");
  });
});
