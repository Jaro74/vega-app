import { describe, expect, it } from "vitest";

import { MockVegaSynastryClient } from "@/libs/vega/synastry-mock-client";

const MADRID = { latitude: 40.4168, longitude: -3.7038, timezoneId: "Europe/Madrid" };
const VALENCIA = { latitude: 39.4699, longitude: -0.3763, timezoneId: "Europe/Madrid" };

describe("MockVegaSynastryClient", () => {
  it("full/full: status ok, al menos 2 evidencias, con orbe/fuerza/exacto", async () => {
    const client = new MockVegaSynastryClient();
    const result = await client.fetchSynastryEvidence({
      birthDataA: { birthDate: "1990-05-12", birthTime: "14:35", birthTimeKnown: true, ...MADRID },
      birthDataB: { birthDate: "1988-03-02", birthTime: "09:15", birthTimeKnown: true, ...VALENCIA },
    });

    expect(result.ok).toBe(true);
    if (result.ok && result.data.status === "ok") {
      expect(result.data.precision).toEqual({ a: "full", b: "full" });
      expect(result.data.allowedEvidence.length).toBeGreaterThanOrEqual(2);
      expect(result.data.allowedEvidence.every((item) => item.payload.orbe !== undefined)).toBe(true);
    }
  });

  it("full/partial: status ok, sin orbe/fuerza/exacto, sin asc/mc de B", async () => {
    const client = new MockVegaSynastryClient();
    const result = await client.fetchSynastryEvidence({
      birthDataA: { birthDate: "1990-05-12", birthTime: "14:35", birthTimeKnown: true, ...MADRID },
      birthDataB: { birthDate: "1988-03-02", birthTime: null, birthTimeKnown: false, ...VALENCIA },
    });

    expect(result.ok).toBe(true);
    if (result.ok && result.data.status === "ok") {
      expect(result.data.precision).toEqual({ a: "full", b: "partial" });
      expect(result.data.allowedEvidence.every((item) => item.payload.orbe === undefined)).toBe(true);
      expect(result.data.allowedEvidence.every((item) => item.subject.personBBody !== "asc" && item.subject.personBBody !== "mc")).toBe(true);
    }
  });

  it("partial/partial: status ok, al menos 2 evidencias, sin angulos", async () => {
    const client = new MockVegaSynastryClient();
    const result = await client.fetchSynastryEvidence({
      birthDataA: { birthDate: "1990-05-12", birthTime: null, birthTimeKnown: false, ...MADRID },
      birthDataB: { birthDate: "1988-03-02", birthTime: null, birthTimeKnown: false, ...VALENCIA },
    });

    expect(result.ok).toBe(true);
    if (result.ok && result.data.status === "ok") {
      expect(result.data.precision).toEqual({ a: "partial", b: "partial" });
      expect(result.data.allowedEvidence.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("minimal (B sin lugar): insufficient_data, nunca inventa tz/lat/lon", async () => {
    const client = new MockVegaSynastryClient();
    const result = await client.fetchSynastryEvidence({
      birthDataA: { birthDate: "1990-05-12", birthTime: "14:35", birthTimeKnown: true, ...MADRID },
      birthDataB: { birthDate: "1988-03-02", birthTime: null, birthTimeKnown: false, latitude: null, longitude: null, timezoneId: null },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe("insufficient_data");
      if (result.data.status === "insufficient_data") {
        expect(result.data.insufficientParticipants).toEqual(["b"]);
      }
    }
  });
});
