import "server-only";

import OpenAI from "openai";

import { wireToPreviewV1Output } from "./client";
import type { PreviewModelClient, PreviewModelResult, PreviewPromptInput } from "./client";
import { buildPreviewUserInput, PREVIEW_SYSTEM_PROMPT } from "./preview-prompt";
import { isPreviewV1Wire, PREVIEW_V1_JSON_SCHEMA } from "./preview-schema";
import { buildSynastryPreviewUserInput, SYNASTRY_PREVIEW_SYSTEM_PROMPT } from "./synastry-preview-prompt";

// Elige system prompt + input segun el segmento (Sprint 3B): unico punto
// de la capa OpenAI que discrimina por "segment", para no repetir esa
// decision ni en el cliente real ni en el mock.
function messagesFor(input: PreviewPromptInput): { system: string; user: string } {
  if (input.segment === "B") {
    return { system: SYNASTRY_PREVIEW_SYSTEM_PROMPT, user: buildSynastryPreviewUserInput(input) };
  }
  return { system: PREVIEW_SYSTEM_PROMPT, user: buildPreviewUserInput(input) };
}

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MODEL = "gpt-5.6-luna";

function isRetryableError(error: unknown): boolean {
  if (error instanceof OpenAI.APIConnectionTimeoutError) return true;
  if (error instanceof OpenAI.APIError) {
    return typeof error.status === "number" && error.status >= 500;
  }
  return false;
}

function requireApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no configurada. Obligatoria cuando OPENAI_PREVIEW_CLIENT_DRIVER=real.");
  }
  return apiKey;
}

// Cliente real de generacion de preview_v1 via Responses API + Structured
// Outputs (VEGA_Plan_Tecnico, secciones 26-31). Solo un retry automatico,
// unicamente ante timeout o error 5xx (nunca ante safety failure o input
// invalido). Server-side exclusivamente: OPENAI_API_KEY nunca se expone
// al navegador.
export class OpenAIPreviewModelClient implements PreviewModelClient {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor() {
    this.client = new OpenAI({ apiKey: requireApiKey() });
    this.model = process.env.OPENAI_PREVIEW_MODEL || DEFAULT_MODEL;
    this.timeoutMs = Number(process.env.OPENAI_PREVIEW_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  }

  async generatePreview(input: PreviewPromptInput): Promise<PreviewModelResult> {
    const attempt = async (): Promise<PreviewModelResult> => {
      const { system, user } = messagesFor(input);
      const startedAt = Date.now();
      const response = await this.client.responses.create(
        {
          model: this.model,
          store: false,
          input: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          text: {
            format: {
              type: "json_schema",
              name: PREVIEW_V1_JSON_SCHEMA.name,
              schema: PREVIEW_V1_JSON_SCHEMA.schema,
              strict: PREVIEW_V1_JSON_SCHEMA.strict,
            },
          },
        },
        { timeout: this.timeoutMs, maxRetries: 0 }
      );

      const latencyMs = Date.now() - startedAt;

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(response.output_text);
      } catch {
        return { ok: false, errorType: "schema_invalid", detail: "output_text no es JSON valido" };
      }

      if (!isPreviewV1Wire(parsedJson)) {
        return { ok: false, errorType: "schema_invalid", detail: "output_text no cumple el schema preview_v1" };
      }

      const wire = parsedJson;
      return {
        ok: true,
        output: wireToPreviewV1Output(wire),
        latencyMs,
        modelId: this.model,
      };
    };

    try {
      return await attempt();
    } catch (error) {
      if (!isRetryableError(error)) {
        return errorResult(error);
      }
      // Un unico retry automatico ante timeout/5xx (VEGA_Plan_Tecnico, seccion 31).
      try {
        return await attempt();
      } catch (retryError) {
        return errorResult(retryError);
      }
    }
  }
}

function errorResult(error: unknown): PreviewModelResult {
  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return { ok: false, errorType: "llm_timeout" };
  }
  return {
    ok: false,
    errorType: "unknown",
    detail: error instanceof Error ? error.message : String(error),
  };
}
