import type { PreviewModelClient, PreviewModelResult, PreviewPromptInput } from "./client";

const MOCK_MODEL_ID = "mock-preview-model";

// Doble de pruebas para el desarrollo/CI normal
// (OPENAI_PREVIEW_CLIENT_DRIVER=mock, valor por defecto): genera un
// preview_v1 valido y deterministico sin llamar a OpenAI, para poder
// probar el pipeline completo (validacion, persistencia, UI, E2E) sin
// coste ni dependencia de red. Referencia siempre los IDs recibidos en
// allowedEvidence (nunca inventa uno). Segmento A: respeta la regla de no
// mencionar Ascendente/casas/MC cuando timeKnown es false. Segmento B
// (Sprint 3B): nunca menciona casas (no existen en sinastria v1), nunca
// afirma exactitud/orbe/grados (el mock no depende del payload real de
// cada item), y respeta los roles direccionales tu/su.
export class MockPreviewModelClient implements PreviewModelClient {
  async generatePreview(input: PreviewPromptInput): Promise<PreviewModelResult> {
    if (input.segment === "B") return this.generateSynastryPreview(input);
    return this.generateNatalPreview(input);
  }

  private async generateNatalPreview(
    input: Extract<PreviewPromptInput, { segment: "A" }>
  ): Promise<PreviewModelResult> {
    const [first, second] = input.allowedEvidence;
    if (!first || !second) {
      return { ok: false, errorType: "unknown", detail: "se requieren al menos 2 evidencias" };
    }

    const limitation = input.timeKnown
      ? "Esta lectura utiliza los factores disponibles para tu carta natal en este primer avance."
      : "Como no conocemos tu hora de nacimiento, esta lectura no utiliza casas ni Ascendente.";

    return {
      ok: true,
      modelId: MOCK_MODEL_ID,
      latencyMs: 1,
      output: {
        mainInsight:
          "En este momento parece haber una tensión entre lo que sientes que deberías hacer y lo que realmente " +
          "te está pidiendo la situación. Los factores que estamos observando en tu carta apuntan a un periodo " +
          "donde conviene mirar hacia dentro antes de decidir el siguiente paso.",
        evidence: [
          { id: first.id, label: "Primer factor observado", interpretationScope: "Contexto general de la situación" },
          { id: second.id, label: "Segundo factor observado", interpretationScope: "Matiz adicional del momento actual" },
        ],
        contextualInterpretation:
          "Relacionando estos factores con lo que nos has contado, tiene sentido que esta situación te resulte " +
          "especialmente presente ahora mismo, incluso si todavía no consigues ponerle nombre del todo. No se " +
          "trata de un patrón fijo, sino de un momento que invita a prestar atención a cómo estás respondiendo " +
          "a lo que ocurre a tu alrededor, sin forzar todavía una conclusión definitiva sobre lo que vendrá después.",
        limitation,
        openQuestion: "¿Quieres explorar primero por qué este patrón parece repetirse o qué está especialmente activo ahora?",
        safetyFlags: [],
        unsupportedClaims: [],
        insufficientEvidence: false,
      },
    };
  }

  private async generateSynastryPreview(
    input: Extract<PreviewPromptInput, { segment: "B" }>
  ): Promise<PreviewModelResult> {
    const [first, second] = input.allowedEvidence;
    if (!first || !second) {
      return { ok: false, errorType: "unknown", detail: "se requieren al menos 2 evidencias" };
    }

    const bothFull = input.userProfilePrecision === "full" && input.partnerPrecision === "full";
    const limitation = bothFull
      ? "Esta lectura utiliza los factores de conexión disponibles entre ambas cartas en este primer avance."
      : "Como no conocemos la hora de nacimiento de al menos una de las dos personas, esta lectura no utiliza Ascendente ni Medio Cielo de esa persona.";

    return {
      ok: true,
      modelId: MOCK_MODEL_ID,
      latencyMs: 1,
      output: {
        mainInsight:
          "Entre vosotros parece haber una combinación de factores que invita tanto a la cercanía como a cierta " +
          "fricción ocasional. Lo que estamos observando en la comparación entre ambas cartas apunta a una " +
          "dinámica que conviene explorar con calma, sin sacar conclusiones cerradas todavía.",
        evidence: [
          { id: first.id, label: "Primer factor de conexión observado", interpretationScope: "Dinámica general entre ambos" },
          { id: second.id, label: "Segundo factor de conexión observado", interpretationScope: "Matiz adicional de la relación" },
        ],
        contextualInterpretation:
          "Relacionando estos factores con lo que nos has contado, tiene sentido que esta dinámica se note " +
          "especialmente en ciertos momentos de la relación, incluso si todavía no consigues ponerle nombre del " +
          "todo. No se trata de un patrón fijo entre vosotros, sino de una tendencia que invita a prestar " +
          "atención a cómo respondéis cada uno cuando aparece, sin forzar todavía una conclusión sobre el futuro.",
        limitation,
        openQuestion: "¿Quieres explorar primero qué os conecta o qué ocurre cuando aparece tensión entre vosotros?",
        safetyFlags: [],
        unsupportedClaims: [],
        insufficientEvidence: false,
      },
    };
  }
}
