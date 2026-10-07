import { describe, expect, it } from "vitest";

import { validateSynastryPreviewForGeneration } from "@/libs/validation/synastry-preview-generation";
import type { SynastryValidationContext } from "@/libs/validation/synastry-preview-generation";
import type { PreviewV1Output } from "@/types/preview";
import type { VegaSynastryEvidenceItem } from "@/types/synastry";

function buildEvidenceItem(overrides: Partial<VegaSynastryEvidenceItem> = {}): VegaSynastryEvidenceItem {
  return {
    id: "ev_ab_001",
    synEvidenceSchemaVersion: "syn_evidence_v1",
    synFactsVersion: "syn_facts_v1",
    synClaimsVersion: "syn_claims_v1",
    factsVersion: "facts_v1",
    chartIdA: "chart-a",
    chartIdB: "chart-b",
    kind: "inter_chart_aspect",
    subject: { personABody: "sun", personBBody: "moon" },
    payload: { type: "trigono", toca_luminaria: true, toca_angulo: false, orbe_max: 8 },
    provenance: { source: "synastry_structural_claim" },
    ...overrides,
  };
}

const allowedEvidence: VegaSynastryEvidenceItem[] = [
  buildEvidenceItem({ id: "ev_001", subject: { personABody: "sun", personBBody: "moon" } }),
  buildEvidenceItem({ id: "ev_002", subject: { personABody: "venus", personBBody: "mars" } }),
];

const WORDS_46 =
  "Entre vosotros parece haber una combinacion de factores que invita tanto a la cercania como a " +
  "cierta friccion ocasional. Lo que estamos observando en la comparacion entre ambas cartas apunta " +
  "a una dinamica que conviene explorar con calma, sin sacar conclusiones cerradas todavia.";

const WORDS_67 =
  "Relacionando estos factores con lo que nos has contado, tiene sentido que esta dinamica se note " +
  "especialmente en ciertos momentos de la relacion, incluso si todavia no consigues ponerle nombre " +
  "del todo. No se trata de un patron fijo entre vosotros, sino de una tendencia que invita a prestar " +
  "atencion a como respondeis cada uno cuando aparece, sin forzar todavia una conclusion sobre el futuro.";

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

const fullContext: SynastryValidationContext = { allowedEvidence, timeKnownA: true, timeKnownB: true };

describe("validateSynastryPreviewForGeneration", () => {
  it("acepta una preview valida con ambos time_known=true", () => {
    const result = validateSynastryPreviewForGeneration(buildOutput(), fullContext);
    expect(result.valid).toBe(true);
  });

  it("rechaza un ID de evidencia inventado", () => {
    const output = buildOutput({
      evidence: [
        { id: "ev_001", label: "Factor 1", interpretationScope: "contexto" },
        { id: "ev_999_inventado", label: "Factor inventado", interpretationScope: "contexto" },
      ],
    });
    const result = validateSynastryPreviewForGeneration(output, fullContext);
    expect(result.valid).toBe(false);
    expect(result.errorType).toBe("unsupported_evidence");
  });

  it("rechaza el mismo ID de evidencia repetido dos veces", () => {
    const output = buildOutput({
      evidence: [
        { id: "ev_001", label: "Factor 1", interpretationScope: "contexto" },
        { id: "ev_001", label: "Factor 1 otra vez", interpretationScope: "contexto" },
      ],
    });
    const result = validateSynastryPreviewForGeneration(output, fullContext);
    expect(result.valid).toBe(false);
    expect(result.errorType).toBe("unsupported_evidence");
  });

  it("rechaza unsupported_claims no vacio", () => {
    const result = validateSynastryPreviewForGeneration(
      buildOutput({ unsupportedClaims: ["afirmacion sin respaldo"] }),
      fullContext
    );
    expect(result.valid).toBe(false);
    expect(result.errorType).toBe("unsupported_evidence");
  });

  it("rechaza safety_flags no vacio", () => {
    const result = validateSynastryPreviewForGeneration(buildOutput({ safetyFlags: ["riesgo"] }), fullContext);
    expect(result.valid).toBe(false);
    expect(result.errorType).toBe("safety_failure");
  });

  it("rechaza un main_insight fuera de rango de palabras", () => {
    const result = validateSynastryPreviewForGeneration(buildOutput({ mainInsight: "Muy corto." }), fullContext);
    expect(result.valid).toBe(false);
    expect(result.errorType).toBe("schema_invalid");
  });

  it("rechaza mencionar casas, incluso con ambos time_known=true (sinastria v1 nunca tiene casas)", () => {
    const output = buildOutput({ mainInsight: `${WORDS_46} Esto tambien afecta a vuestras casas.` });
    const result = validateSynastryPreviewForGeneration(output, fullContext);
    expect(result.valid).toBe(false);
    expect(result.errorType).toBe("unsupported_evidence");
  });

  it("rechaza asc elegido para A cuando timeKnownA=false", () => {
    const contextPartialA: SynastryValidationContext = {
      allowedEvidence: [
        buildEvidenceItem({ id: "ev_001", subject: { personABody: "asc", personBBody: "mars" } }),
        buildEvidenceItem({ id: "ev_002", subject: { personABody: "venus", personBBody: "mars" } }),
      ],
      timeKnownA: false,
      timeKnownB: true,
    };
    const result = validateSynastryPreviewForGeneration(buildOutput(), contextPartialA);
    expect(result.valid).toBe(false);
    expect(result.errorType).toBe("unsupported_evidence");
  });

  it("rechaza 'su Ascendente' en el texto cuando timeKnownB=false, aunque la evidencia elegida no dependa de hora", () => {
    const contextPartialB: SynastryValidationContext = { allowedEvidence, timeKnownA: true, timeKnownB: false };
    const output = buildOutput({ mainInsight: `${WORDS_46} Esto conecta con su Ascendente.` });
    const result = validateSynastryPreviewForGeneration(output, contextPartialB);
    expect(result.valid).toBe(false);
    expect(result.errorType).toBe("unsupported_evidence");
  });

  it("rechaza afirmar exactitud cuando ningun item elegido tiene payload.exacto=true", () => {
    const output = buildOutput({ mainInsight: `${WORDS_46} Este aspecto es exacto.` });
    const result = validateSynastryPreviewForGeneration(output, fullContext);
    expect(result.valid).toBe(false);
    expect(result.errorType).toBe("unsupported_evidence");
  });

  it("rechaza mencionar grados/orbe cuando ningun item elegido tiene payload.orbe (partial involucrado)", () => {
    const output = buildOutput({ mainInsight: `${WORDS_46} Con un orbe de 2 grados.` });
    const result = validateSynastryPreviewForGeneration(output, fullContext);
    expect(result.valid).toBe(false);
    expect(result.errorType).toBe("unsupported_evidence");
  });

  it("acepta afirmar exactitud cuando el item elegido SI tiene payload.exacto=true", () => {
    const contextExact: SynastryValidationContext = {
      allowedEvidence: [
        buildEvidenceItem({ id: "ev_001", payload: { type: "trigono", toca_luminaria: true, toca_angulo: false, orbe_max: 8, orbe: 0.1, fuerza: 0.95, exacto: true } }),
        buildEvidenceItem({ id: "ev_002", subject: { personABody: "venus", personBBody: "mars" } }),
      ],
      timeKnownA: true,
      timeKnownB: true,
    };
    const output = buildOutput({ mainInsight: `${WORDS_46} Este aspecto es prácticamente exacto.` });
    const result = validateSynastryPreviewForGeneration(output, contextExact);
    expect(result.valid).toBe(true);
  });

  it("rechaza intercambio de roles: 'tu Marte' cuando Marte solo aparece como person_b_body", () => {
    const contextMars: SynastryValidationContext = {
      allowedEvidence: [
        buildEvidenceItem({ id: "ev_001", subject: { personABody: "sun", personBBody: "mars" } }),
        buildEvidenceItem({ id: "ev_002", subject: { personABody: "venus", personBBody: "moon" } }),
      ],
      timeKnownA: true,
      timeKnownB: true,
    };
    const output = buildOutput({ mainInsight: `${WORDS_46} Esto conecta con tu Marte.` });
    const result = validateSynastryPreviewForGeneration(output, contextMars);
    expect(result.valid).toBe(false);
    expect(result.errorType).toBe("unsupported_evidence");
  });

  it("no genera falso positivo de intercambio de roles cuando el mismo cuerpo aparece en ambos lados (venus/venus)", () => {
    const contextSameBody: SynastryValidationContext = {
      allowedEvidence: [
        buildEvidenceItem({ id: "ev_001", subject: { personABody: "venus", personBBody: "venus" } }),
        buildEvidenceItem({ id: "ev_002", subject: { personABody: "sun", personBBody: "moon" } }),
      ],
      timeKnownA: true,
      timeKnownB: true,
    };
    const output = buildOutput({ mainInsight: `${WORDS_46} Tu Venus y su Venus se conectan.` });
    const result = validateSynastryPreviewForGeneration(output, contextSameBody);
    expect(result.valid).toBe(true);
  });

  it("rechaza lenguaje de compatibilidad/porcentajes fuera de alcance", () => {
    const output = buildOutput({ mainInsight: `${WORDS_46} Sois almas gemelas.` });
    const result = validateSynastryPreviewForGeneration(output, fullContext);
    expect(result.valid).toBe(false);
    expect(result.errorType).toBe("unsupported_evidence");
  });
});
