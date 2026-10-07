import { describe, expect, it } from "vitest";

import { derivePartnerPrecision, partnerRequestSchema } from "@/libs/validation/partner";

const flowAttemptId = "8c9c7d2e-4c1b-4b8a-8c1a-1a2b3c4d5e6f";

describe("partnerRequestSchema", () => {
  it("nunca expone campos de identidad de la segunda persona en el tipo inferido", () => {
    const result = partnerRequestSchema.safeParse({
      flowAttemptId,
      birthDate: "1985-03-02",
      name: "Alguien",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // El contrato (PartnerRequestInput) no declara "name": aunque llegue
      // en el payload bruto, nunca se propaga mas alla de este parse.
      expect("name" in result.data).toBe(false);
    }
  });

  it("rechaza birthTime sin birthTimeKnown=true", () => {
    const result = partnerRequestSchema.safeParse({
      flowAttemptId,
      birthDate: "1985-03-02",
      birthTimeKnown: false,
      birthTime: "10:00",
    });
    expect(result.success).toBe(false);
  });
});

describe("derivePartnerPrecision", () => {
  it("devuelve full con fecha, hora y lugar", () => {
    const precision = derivePartnerPrecision({
      flowAttemptId,
      birthDate: "1985-03-02",
      birthTimeKnown: true,
      birthTime: "10:00",
      placeId: 3117735,
    });
    expect(precision).toBe("full");
  });

  it("devuelve partial con fecha y lugar, sin hora", () => {
    const precision = derivePartnerPrecision({
      flowAttemptId,
      birthDate: "1985-03-02",
      placeId: 3117735,
    });
    expect(precision).toBe("partial");
  });

  it("devuelve minimal solo con fecha", () => {
    const precision = derivePartnerPrecision({
      flowAttemptId,
      birthDate: "1985-03-02",
    });
    expect(precision).toBe("minimal");
  });
});
