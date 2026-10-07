import "server-only";

import { MockPreviewModelClient } from "./mock-client";
import { OpenAIPreviewModelClient } from "./http-client";
import type { PreviewModelClient } from "./client";

export type OpenAIPreviewClientDriver = "mock" | "real";

// "real" exige OPENAI_API_KEY (Responses API + Structured Outputs). Por
// defecto (o cualquier valor distinto de "real") se usa "mock": mismo
// patron que resolveExperimentDbDriver / resolveVegaClientDriver.
export function resolveOpenAIPreviewClientDriver(): OpenAIPreviewClientDriver {
  return process.env.OPENAI_PREVIEW_CLIENT_DRIVER === "real" ? "real" : "mock";
}

type GlobalWithPreviewModelClient = typeof globalThis & {
  __vegaPreviewModelClient?: PreviewModelClient;
};

const globalWithPreviewModelClient = globalThis as GlobalWithPreviewModelClient;

export function getPreviewModelClient(): PreviewModelClient {
  if (!globalWithPreviewModelClient.__vegaPreviewModelClient) {
    globalWithPreviewModelClient.__vegaPreviewModelClient =
      resolveOpenAIPreviewClientDriver() === "real" ? new OpenAIPreviewModelClient() : new MockPreviewModelClient();
  }
  return globalWithPreviewModelClient.__vegaPreviewModelClient;
}

// Solo para tests.
export function resetPreviewModelClientForTests(): void {
  globalWithPreviewModelClient.__vegaPreviewModelClient = undefined;
}

export * from "./client";
