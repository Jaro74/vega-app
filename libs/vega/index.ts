import "server-only";

import { HttpVegaEvidenceClient } from "./http-client";
import { MockVegaEvidenceClient } from "./mock-client";
import { HttpVegaSynastryClient } from "./synastry-http-client";
import { MockVegaSynastryClient } from "./synastry-mock-client";
import type { VegaEvidenceClient } from "./client";
import type { VegaSynastryClient } from "./synastry-client";

export type VegaClientDriver = "mock" | "real";

// "real" exige VEGA_API_BASE_URL + SONDA19_INTERNAL_EVIDENCE_TOKEN (un
// proyecto Vega real en Railway). Por defecto (o cualquier valor
// distinto de "real") se usa "mock": mismo patron que
// resolveExperimentDbDriver (libs/db/index.ts). Comparte driver con el
// cliente de sinastria (Sprint 3B): mismo proyecto Vega, mismo token.
export function resolveVegaClientDriver(): VegaClientDriver {
  return process.env.VEGA_CLIENT_DRIVER === "real" ? "real" : "mock";
}

type GlobalWithVegaClient = typeof globalThis & {
  __vegaEvidenceClient?: VegaEvidenceClient;
  __vegaSynastryClient?: VegaSynastryClient;
};

const globalWithVegaClient = globalThis as GlobalWithVegaClient;

export function getVegaEvidenceClient(): VegaEvidenceClient {
  if (!globalWithVegaClient.__vegaEvidenceClient) {
    globalWithVegaClient.__vegaEvidenceClient =
      resolveVegaClientDriver() === "real" ? new HttpVegaEvidenceClient() : new MockVegaEvidenceClient();
  }
  return globalWithVegaClient.__vegaEvidenceClient;
}

export function getVegaSynastryClient(): VegaSynastryClient {
  if (!globalWithVegaClient.__vegaSynastryClient) {
    globalWithVegaClient.__vegaSynastryClient =
      resolveVegaClientDriver() === "real" ? new HttpVegaSynastryClient() : new MockVegaSynastryClient();
  }
  return globalWithVegaClient.__vegaSynastryClient;
}

// Solo para tests.
export function resetVegaEvidenceClientForTests(): void {
  globalWithVegaClient.__vegaEvidenceClient = undefined;
  globalWithVegaClient.__vegaSynastryClient = undefined;
}

export * from "./client";
export * from "./synastry-client";
