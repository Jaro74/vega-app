import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mockea el SDK "openai" en si (no una llamada HTTP cruda): el cliente real
// (OpenAIPreviewModelClient) construye `new OpenAI(...)` y llama a
// `this.client.responses.create(...)`, asi que el punto de interceptacion
// correcto es el constructor/metodo del SDK, no fetch global. createMock se
// declara con vi.hoisted porque vi.mock("openai", ...) se hoistea por
// encima de los imports: sin esto, la factory no podria referenciar una
// variable del cuerpo del test.
const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock("openai", () => {
  class APIError extends Error {
    status?: number;
  }
  class APIConnectionTimeoutError extends Error {}

  class MockOpenAI {
    responses = { create: createMock };
    constructor(_config: { apiKey: string }) {}
  }

  return { default: Object.assign(MockOpenAI, { APIError, APIConnectionTimeoutError }) };
});

import { OpenAIPreviewModelClient } from "@/libs/openai/http-client";
import type { NatalPreviewPromptInput } from "@/libs/openai/preview-prompt";
import type { PreviewV1Wire } from "@/libs/openai/preview-schema";
import { PREVIEW_V1_JSON_SCHEMA } from "@/libs/openai/preview-schema";

const ORIGINAL_ENV = { ...process.env };

function validWireOutput(): PreviewV1Wire {
  return {
    main_insight: "Insight de prueba.",
    evidence: [
      { id: "ev_001", label: "Evidencia 1", interpretation_scope: "ambito 1" },
      { id: "ev_002", label: "Evidencia 2", interpretation_scope: "ambito 2" },
    ],
    contextual_interpretation: "Interpretacion de prueba.",
    limitation: "Limitacion de prueba.",
    open_question: "¿Pregunta de prueba?",
    safety_flags: [],
    unsupported_claims: [],
  };
}

const naturalInput: NatalPreviewPromptInput = {
  segment: "A",
  trigger: "career",
  userContext: "contexto de prueba",
  timeKnown: true,
  allowedEvidence: [
    { id: "ev_001", kind: "planet_position", subject: "sun", payload: {} },
    { id: "ev_002", kind: "aspect", subject: "sun_moon", payload: {} },
  ],
};

describe("OpenAIPreviewModelClient", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key-no-real";
    process.env.OPENAI_PREVIEW_MODEL = "gpt-5.6-luna";
    createMock.mockReset();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("envia store:false manteniendo model, input y text.format.type='json_schema'", async () => {
    createMock.mockResolvedValue({ output_text: JSON.stringify(validWireOutput()) });

    const client = new OpenAIPreviewModelClient();
    const result = await client.generatePreview(naturalInput);

    expect(result.ok).toBe(true);
    expect(createMock).toHaveBeenCalledTimes(1);

    const [body] = createMock.mock.calls[0] as [Record<string, unknown>, unknown];

    expect(body.store).toBe(false);
    expect(body.model).toBe("gpt-5.6-luna");
    expect(body.input).toHaveLength(2);
    expect((body.text as { format: { type: string } }).format.type).toBe("json_schema");
    expect((body.text as { format: { name: string } }).format.name).toBe(PREVIEW_V1_JSON_SCHEMA.name);
  });
});
