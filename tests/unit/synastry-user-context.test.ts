import { describe, expect, it } from "vitest";

import { buildStructuredUserContext } from "@/libs/openai/synastry-user-context";
import { RELATIONSHIP_FOCUS_OPTIONS, USER_EMOTIONAL_STATE_OPTIONS } from "@/types/experiment";

describe("buildStructuredUserContext", () => {
  it("devuelve null si no hay ningun campo relleno", () => {
    expect(buildStructuredUserContext({ relationshipFocus: null, userEmotionalState: null, impactIntensity: null })).toBeNull();
  });

  it.each(RELATIONSHIP_FOCUS_OPTIONS)("relationshipFocus=%s produce una frase que empieza por 'El usuario' y nunca contiene el valor crudo", (value) => {
    const result = buildStructuredUserContext({ relationshipFocus: value, userEmotionalState: null, impactIntensity: null });
    expect(result).not.toBeNull();
    expect(result).toMatch(/^El usuario /);
    expect(result).not.toContain(value);
  });

  it.each(USER_EMOTIONAL_STATE_OPTIONS)("userEmotionalState=%s produce una frase en primera persona sobre el usuario, nunca el valor crudo", (value) => {
    const result = buildStructuredUserContext({ relationshipFocus: null, userEmotionalState: value, impactIntensity: null });
    expect(result).not.toBeNull();
    expect(result).toMatch(/^El usuario /);
    // No se compara con `not.toContain(value)` a secas: "distant"/"calm"
    // son substrings legitimos de su propia traduccion ("distante",
    // "calma") por la raiz latina compartida -- no es una fuga del
    // valor crudo en ingles, es la traduccion correcta. La comprobacion
    // real es que la frase nunca es exactamente el valor crudo ni lo
    // envuelve tal cual (p.ej. entre corchetes o como palabra suelta en
    // ingles).
    expect(result).not.toBe(value);
    expect(result?.split(" ")).not.toContain(value);
  });

  it.each([1, 2, 3, 4, 5] as const)("impactIntensity=%d produce una frase con esa cifra sobre 5", (value) => {
    const result = buildStructuredUserContext({ relationshipFocus: null, userEmotionalState: null, impactIntensity: value });
    expect(result).toBe(`El usuario describe el impacto de esta situación en su vida ahora mismo como ${value}/5.`);
  });

  it("combina los 3 campos en el orden relationshipFocus -> userEmotionalState -> impactIntensity", () => {
    const result = buildStructuredUserContext({
      relationshipFocus: "communication",
      userEmotionalState: "curious",
      impactIntensity: 2,
    });
    expect(result).toBe(
      "El usuario quiere entender mejor cómo se comunican en esta relación. " +
        "El usuario siente curiosidad respecto a esta relación. " +
        "El usuario describe el impacto de esta situación en su vida ahora mismo como 2/5."
    );
  });

  it("ignora un relationshipFocus fuera de catalogo en vez de lanzar o incluirlo tal cual", () => {
    const result = buildStructuredUserContext({ relationshipFocus: "conflict", userEmotionalState: null, impactIntensity: null });
    expect(result).toBeNull();
  });

  it("ignora un userEmotionalState fuera de catalogo", () => {
    const result = buildStructuredUserContext({ relationshipFocus: null, userEmotionalState: "anxious", impactIntensity: null });
    expect(result).toBeNull();
  });

  it("ignora un impactIntensity fuera de 1..5", () => {
    expect(buildStructuredUserContext({ relationshipFocus: null, userEmotionalState: null, impactIntensity: 0 })).toBeNull();
    expect(buildStructuredUserContext({ relationshipFocus: null, userEmotionalState: null, impactIntensity: 6 })).toBeNull();
  });

  it("ninguna frase menciona a la otra persona como sujeto (nunca 'tu pareja'/'la otra persona es')", () => {
    for (const relationshipFocus of RELATIONSHIP_FOCUS_OPTIONS) {
      const result = buildStructuredUserContext({ relationshipFocus, userEmotionalState: null, impactIntensity: null });
      expect(result?.toLowerCase()).not.toContain("la otra persona es");
      expect(result?.toLowerCase()).not.toContain("tu pareja es");
    }
  });
});
