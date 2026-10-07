import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpVegaEvidenceClient } from "@/libs/vega/http-client";

const ORIGINAL_ENV = { ...process.env };

function validResponsePayload() {
  return {
    request_id: "req-1",
    chart_id: "chart-1",
    versions: { facts: "facts_v1", claims: "claims_v1", evidence_schema: "evidence_v1" },
    time_context: { time_known: true },
    allowed_evidence: [
      {
        id: "ev_001",
        schema_version: "evidence_v1",
        facts_version: "facts_v1",
        claims_version: "claims_v1",
        chart_id: "chart-1",
        kind: "planet_position",
        subject: "sun",
        payload: {},
        provenance: { source: "structural_claim" },
      },
      {
        id: "ev_002",
        schema_version: "evidence_v1",
        facts_version: "facts_v1",
        claims_version: "claims_v1",
        chart_id: "chart-1",
        kind: "aspect",
        subject: "sun_moon",
        payload: {},
        provenance: { source: "structural_claim" },
      },
    ],
  };
}

const requestInput = {
  requestId: "req-1",
  birthData: {
    birthDate: "1990-05-12",
    birthTime: "14:35",
    birthTimeKnown: true,
    latitude: 40.4168,
    longitude: -3.7038,
    timezoneId: "Europe/Madrid",
  },
};

describe("HttpVegaEvidenceClient", () => {
  beforeEach(() => {
    process.env.VEGA_API_BASE_URL = "https://vega.example.com";
    process.env.SONDA19_INTERNAL_EVIDENCE_TOKEN = "test-token";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("envia el contrato correcto: endpoint, header de autenticacion y birth_data", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => validResponsePayload(),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new HttpVegaEvidenceClient();
    const result = await client.fetchNatalEvidence(requestInput);

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://vega.example.com/evidence/natal");
    expect(init.method).toBe("POST");
    expect(init.headers["X-Internal-Evidence-Token"]).toBe("test-token");

    const body = JSON.parse(init.body);
    expect(body.request_id).toBe("req-1");
    // Contrato real verificado contra Vega en Railway (gate Sprint 3A):
    // campos cortos y/mo/d/h/mi/tz/lat/lon + time_known explicito, no
    // birth_date/birth_time/latitude/longitude/timezone_id.
    expect(body.birth_data).toEqual({
      y: 1990,
      mo: 5,
      d: 12,
      h: 14,
      mi: 35,
      tz: "Europe/Madrid",
      lat: 40.4168,
      lon: -3.7038,
      time_known: true,
    });
  });

  it("omite h/mi cuando birthTimeKnown=false y envia time_known=false", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...validResponsePayload(), time_context: { time_known: false } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new HttpVegaEvidenceClient();
    await client.fetchNatalEvidence({
      requestId: "req-2",
      birthData: {
        birthDate: "1990-05-12",
        birthTime: null,
        birthTimeKnown: false,
        latitude: 40.4168,
        longitude: -3.7038,
        timezoneId: "Europe/Madrid",
      },
    });

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init.body);
    expect(body.birth_data).toEqual({
      y: 1990,
      mo: 5,
      d: 12,
      tz: "Europe/Madrid",
      lat: 40.4168,
      lon: -3.7038,
      time_known: false,
    });
    expect(body.birth_data.h).toBeUndefined();
    expect(body.birth_data.mi).toBeUndefined();
  });

  it("propaga un error http (status no ok) como http_error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
    );

    const client = new HttpVegaEvidenceClient();
    const result = await client.fetchNatalEvidence(requestInput);

    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.errorType).toBe("http_error");
  });

  it("propaga un timeout (AbortError) como timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        const error = new Error("aborted");
        error.name = "AbortError";
        return Promise.reject(error);
      })
    );

    const client = new HttpVegaEvidenceClient();
    const result = await client.fetchNatalEvidence(requestInput);

    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.errorType).toBe("timeout");
  });

  it("rechaza una respuesta valida en HTTP pero invalida segun el contrato (versions incorrectas)", async () => {
    const payload = validResponsePayload();
    payload.versions.facts = "facts_v2";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => payload }));

    const client = new HttpVegaEvidenceClient();
    const result = await client.fetchNatalEvidence(requestInput);

    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.errorType).toBe("invalid_versions");
  });

  it("lanza si VEGA_API_BASE_URL no esta configurada", async () => {
    delete process.env.VEGA_API_BASE_URL;
    const client = new HttpVegaEvidenceClient();
    await expect(client.fetchNatalEvidence(requestInput)).rejects.toThrow(/VEGA_API_BASE_URL/);
  });
});
