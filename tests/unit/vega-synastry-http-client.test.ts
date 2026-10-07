import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpVegaSynastryClient } from "@/libs/vega/synastry-http-client";

const ORIGINAL_ENV = { ...process.env };

function validResponsePayload() {
  return {
    request_id: "req-1",
    status: "ok",
    chart_id_a: "chart-a",
    chart_id_b: "chart-b",
    versions: {
      facts: "facts_v1",
      synastry_facts: "syn_facts_v1",
      synastry_claims: "syn_claims_v1",
      synastry_evidence_schema: "syn_evidence_v1",
    },
    time_context: { time_known_a: true, time_known_b: true },
    precision: { a: "full", b: "full" },
    allowed_evidence: [
      {
        id: "syn_evidence_v1:syn_facts_v1:syn_claims_v1:facts_v1:chart-a:chart-b:inter_aspect:sun:moon:trigono",
        syn_evidence_schema_version: "syn_evidence_v1",
        syn_facts_version: "syn_facts_v1",
        syn_claims_version: "syn_claims_v1",
        facts_version: "facts_v1",
        chart_id_a: "chart-a",
        chart_id_b: "chart-b",
        kind: "inter_chart_aspect",
        subject: { person_a_body: "sun", person_b_body: "moon" },
        payload: { type: "trigono", toca_luminaria: true, toca_angulo: false, orbe_max: 8, orbe: 1.1, fuerza: 0.8, exacto: false },
        provenance: { source: "synastry_structural_claim" },
      },
      {
        id: "syn_evidence_v1:syn_facts_v1:syn_claims_v1:facts_v1:chart-a:chart-b:inter_aspect:venus:mars:conjuncion",
        syn_evidence_schema_version: "syn_evidence_v1",
        syn_facts_version: "syn_facts_v1",
        syn_claims_version: "syn_claims_v1",
        facts_version: "facts_v1",
        chart_id_a: "chart-a",
        chart_id_b: "chart-b",
        kind: "inter_chart_aspect",
        subject: { person_a_body: "venus", person_b_body: "mars" },
        payload: { type: "conjuncion", toca_luminaria: false, toca_angulo: false, orbe_max: 8, orbe: 2.3, fuerza: 0.5, exacto: false },
        provenance: { source: "synastry_structural_claim" },
      },
    ],
  };
}

const requestInput = {
  requestId: "req-1",
  birthDataA: {
    birthDate: "1990-05-12",
    birthTime: "14:35",
    birthTimeKnown: true,
    latitude: 40.4168,
    longitude: -3.7038,
    timezoneId: "Europe/Madrid",
  },
  birthDataB: {
    birthDate: "1988-03-02",
    birthTime: "09:15",
    birthTimeKnown: true,
    latitude: 39.4699,
    longitude: -0.3763,
    timezoneId: "Europe/Madrid",
  },
};

describe("HttpVegaSynastryClient", () => {
  beforeEach(() => {
    process.env.VEGA_API_BASE_URL = "https://vega.example.com";
    process.env.SONDA19_INTERNAL_EVIDENCE_TOKEN = "test-token";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("envia el contrato correcto: endpoint, header de autenticacion y birth_data_a/birth_data_b", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => validResponsePayload() });
    vi.stubGlobal("fetch", fetchMock);

    const client = new HttpVegaSynastryClient();
    const result = await client.fetchSynastryEvidence(requestInput);

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://vega.example.com/evidence/synastry");
    expect(init.method).toBe("POST");
    expect(init.headers["X-Internal-Evidence-Token"]).toBe("test-token");

    const body = JSON.parse(init.body);
    expect(body.request_id).toBe("req-1");
    expect(body.birth_data_a).toEqual({
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
    expect(body.birth_data_b).toEqual({
      y: 1988,
      mo: 3,
      d: 2,
      h: 9,
      mi: 15,
      tz: "Europe/Madrid",
      lat: 39.4699,
      lon: -0.3763,
      time_known: true,
    });
  });

  it("omite h/mi de B cuando birthTimeKnown=false y envia time_known=false", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...validResponsePayload(), time_context: { time_known_a: true, time_known_b: false } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new HttpVegaSynastryClient();
    await client.fetchSynastryEvidence({
      ...requestInput,
      birthDataB: { ...requestInput.birthDataB, birthTime: null, birthTimeKnown: false },
    });

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init.body);
    expect(body.birth_data_b.h).toBeUndefined();
    expect(body.birth_data_b.mi).toBeUndefined();
    expect(body.birth_data_b.time_known).toBe(false);
  });

  it("omite tz/lat/lon/h/mi de B cuando no hay lugar (precision minimal), sin inventar ningun valor", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "insufficient_data", request_id: "req-1", insufficient_participants: ["b"] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new HttpVegaSynastryClient();
    const result = await client.fetchSynastryEvidence({
      ...requestInput,
      birthDataB: { birthDate: "1988-03-02", birthTime: null, birthTimeKnown: false, latitude: null, longitude: null, timezoneId: null },
    });

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init.body);
    expect(body.birth_data_b).toEqual({ y: 1988, mo: 3, d: 2, time_known: false });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe("insufficient_data");
  });

  it("propaga un error http (status no ok) como http_error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));

    const client = new HttpVegaSynastryClient();
    const result = await client.fetchSynastryEvidence(requestInput);

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

    const client = new HttpVegaSynastryClient();
    const result = await client.fetchSynastryEvidence(requestInput);

    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.errorType).toBe("timeout");
  });

  it("rechaza una respuesta valida en HTTP pero invalida segun el contrato (versions incorrectas)", async () => {
    const payload = validResponsePayload();
    payload.versions.facts = "facts_v2";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => payload }));

    const client = new HttpVegaSynastryClient();
    const result = await client.fetchSynastryEvidence(requestInput);

    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.errorType).toBe("invalid_versions");
  });

  it("lanza si VEGA_API_BASE_URL no esta configurada", async () => {
    delete process.env.VEGA_API_BASE_URL;
    const client = new HttpVegaSynastryClient();
    await expect(client.fetchSynastryEvidence(requestInput)).rejects.toThrow(/VEGA_API_BASE_URL/);
  });
});
