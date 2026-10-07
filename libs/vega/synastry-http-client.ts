import "server-only";

import type { VegaSynastryBirthData, VegaSynastryRequest } from "@/types/synastry";

import { validateVegaSynastryPayload } from "./synastry-client";
import type { VegaSynastryClient, VegaSynastryFetchResult } from "./synastry-client";

const DEFAULT_TIMEOUT_MS = 15000;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} no configurada. Obligatoria cuando VEGA_CLIENT_DRIVER=real.`);
  }
  return value;
}

// Misma forma corta (y/mo/d/h/mi/tz/lat/lon/time_known) verificada contra
// /evidence/natal en el gate de Sprint 3A, reutilizada aqui para
// birth_data_a/birth_data_b (encargo Sprint 3B, "Utiliza el contrato real
// de nacimiento verificado en Sprint 3A"). A diferencia de natal,
// tz/lat/lon pueden ser null (precision "minimal": solo se conoce la
// fecha) -- verificado contra Railway que, en ese caso, Vega espera esas
// claves ausentes por completo, nunca null. Nunca se inventa un valor.
function toSynastryWireBirthData(birthData: VegaSynastryBirthData): Record<string, unknown> {
  const [y, mo, d] = birthData.birthDate.split("-").map(Number);
  const wire: Record<string, unknown> = { y, mo, d, time_known: birthData.birthTimeKnown };

  if (birthData.timezoneId !== null) wire.tz = birthData.timezoneId;
  if (birthData.latitude !== null) wire.lat = birthData.latitude;
  if (birthData.longitude !== null) wire.lon = birthData.longitude;

  if (birthData.birthTimeKnown && birthData.birthTime) {
    const [h, mi] = birthData.birthTime.split(":").map(Number);
    wire.h = h;
    wire.mi = mi;
  }

  return wire;
}

// Cliente real de POST /evidence/synastry (Sprint 3B). Mismo patron que
// HttpVegaEvidenceClient (natal): autenticacion server-to-server via
// X-Internal-Evidence-Token, mismo VEGA_API_BASE_URL/timeout, solo
// instanciado server-side.
export class HttpVegaSynastryClient implements VegaSynastryClient {
  async fetchSynastryEvidence(input: VegaSynastryRequest): Promise<VegaSynastryFetchResult> {
    const baseUrl = requireEnv("VEGA_API_BASE_URL");
    const token = requireEnv("SONDA19_INTERNAL_EVIDENCE_TOKEN");
    const timeoutMs = Number(process.env.VEGA_API_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${baseUrl.replace(/\/+$/, "")}/evidence/synastry`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Evidence-Token": token,
        },
        body: JSON.stringify({
          request_id: input.requestId,
          birth_data_a: toSynastryWireBirthData(input.birthDataA),
          birth_data_b: toSynastryWireBirthData(input.birthDataB),
        }),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeoutHandle);
      if (error instanceof Error && error.name === "AbortError") {
        return { ok: false, errorType: "timeout" };
      }
      return {
        ok: false,
        errorType: "network_error",
        detail: error instanceof Error ? error.message : String(error),
      };
    }
    clearTimeout(timeoutHandle);

    if (!response.ok) {
      return { ok: false, errorType: "http_error", detail: `status ${response.status}` };
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      return { ok: false, errorType: "invalid_schema", detail: "respuesta no es JSON valido" };
    }

    return validateVegaSynastryPayload(json);
  }
}
