// JSON Schema estricto para Structured Outputs (Responses API), forma
// exacta de preview_v1 tal como la congela el encargo de Sprint 3A
// (VEGA_Fase_4C, bloque I): exactamente dos evidencias, sin campo
// insufficient_evidence. El mapeo a la forma interna camelCase
// (PreviewV1Output, types/preview.ts, ya congelada en Sprint 0) vive en
// http-client.ts / mock-client.ts.
const evidenceItemSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string" },
    label: { type: "string" },
    interpretation_scope: { type: "string" },
  },
  required: ["id", "label", "interpretation_scope"],
} as const;

export const PREVIEW_V1_JSON_SCHEMA = {
  name: "preview_v1",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      main_insight: { type: "string" },
      evidence: {
        type: "array",
        items: evidenceItemSchema,
        minItems: 2,
        maxItems: 2,
      },
      contextual_interpretation: { type: "string" },
      limitation: { type: "string" },
      open_question: { type: "string" },
      safety_flags: { type: "array", items: { type: "string" } },
      unsupported_claims: { type: "array", items: { type: "string" } },
    },
    required: [
      "main_insight",
      "evidence",
      "contextual_interpretation",
      "limitation",
      "open_question",
      "safety_flags",
      "unsupported_claims",
    ],
  },
  strict: true,
} as const;

export interface PreviewV1Wire {
  main_insight: string;
  evidence: [
    { id: string; label: string; interpretation_scope: string },
    { id: string; label: string; interpretation_scope: string },
  ];
  contextual_interpretation: string;
  limitation: string;
  open_question: string;
  safety_flags: string[];
  unsupported_claims: string[];
}

function isEvidenceRefWire(value: unknown): value is PreviewV1Wire["evidence"][number] {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.label === "string" &&
    typeof item.interpretation_scope === "string"
  );
}

// Red de seguridad runtime sobre la respuesta cruda de OpenAI. El schema
// ya se exige con Structured Outputs en modo "strict" (PREVIEW_V1_JSON_SCHEMA),
// pero esta comprobacion evita confiar ciegamente en un output_text que,
// por cualquier motivo (proveedor, version de modelo, etc.), no cumpliera
// esa garantia.
export function isPreviewV1Wire(value: unknown): value is PreviewV1Wire {
  if (typeof value !== "object" || value === null) return false;
  const wire = value as Record<string, unknown>;

  if (typeof wire.main_insight !== "string") return false;
  if (typeof wire.contextual_interpretation !== "string") return false;
  if (typeof wire.limitation !== "string") return false;
  if (typeof wire.open_question !== "string") return false;
  if (!Array.isArray(wire.safety_flags) || !wire.safety_flags.every((item) => typeof item === "string")) {
    return false;
  }
  if (
    !Array.isArray(wire.unsupported_claims) ||
    !wire.unsupported_claims.every((item) => typeof item === "string")
  ) {
    return false;
  }
  if (!Array.isArray(wire.evidence) || wire.evidence.length !== 2) return false;
  return wire.evidence.every(isEvidenceRefWire);
}
