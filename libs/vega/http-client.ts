import "server-only";

import type { VegaBirthData, VegaNatalRequest } from "@/types/vega";

import { validateVegaNatalPayload } from "./client";
import type { VegaEvidenceClient, VegaFetchResult } from "./client";

const DEFAULT_TIMEOUT_MS = 15000;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} no configurada. Obligatoria cuando VEGA_CLIENT_DRIVER=real.`);
  }
  return value;
}

// Forma real de "birth_data" contra POST /evidence/natal (verificado
// contra la API en Railway, gate Sprint 3A): campos cortos y=year,
// mo=month, d=day, h/mi=hour/minute (solo si time_known=true), tz, lat,
// lon, mas un "time_known" explicito. No es el mismo shape que
// VegaBirthData (nuestro tipo interno, mas legible); este mapeo vive
// aqui, aislado en la capa de transporte.
function toWireBirthData(birthData: VegaBirthData): Record<string, unknown> {
  const [y, mo, d] = birthData.birthDate.split("-").map(Number);
  const wire: Record<string, unknown> = {
    y,
    mo,
    d,
    tz: birthData.timezoneId,
    lat: birthData.latitude,
    lon: birthData.longitude,
    time_known: birthData.birthTimeKnown,
  };

  if (birthData.birthTimeKnown && birthData.birthTime) {
    const [h, mi] = birthData.birthTime.split(":").map(Number);
    wire.h = h;
    wire.mi = mi;
  }

  return wire;
}

// Cliente real de POST /evidence/natal (Sprint 3A). Autenticacion
// server-to-server via X-Internal-Evidence-Token; esta clase solo se
// instancia server-side (getVegaEvidenceClient, libs/vega/index.ts) y el
// token nunca se expone al navegador.
export class HttpVegaEvidenceClient implements VegaEvidenceClient {
  async fetchNatalEvidence(input: VegaNatalRequest): Promise<VegaFetchResult> {
    const baseUrl = requireEnv("VEGA_API_BASE_URL");
    const token = requireEnv("SONDA19_INTERNAL_EVIDENCE_TOKEN");
    const timeoutMs = Number(process.env.VEGA_API_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${baseUrl.replace(/\/+$/, "")}/evidence/natal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Evidence-Token": token,
        },
        body: JSON.stringify({
          request_id: input.requestId,
          birth_data: toWireBirthData(input.birthData),
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

    return validateVegaNatalPayload(json);
  }
}
