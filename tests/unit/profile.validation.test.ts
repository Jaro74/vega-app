import { describe, expect, it } from "vitest";

import { ownProfileRequestSchema } from "@/libs/validation/profile";

const baseInput = {
  flowAttemptId: "8c9c7d2e-4c1b-4b8a-8c1a-1a2b3c4d5e6f",
  birthDate: "1990-05-12",
  placeId: 3117735,
};

describe("ownProfileRequestSchema", () => {
  it("acepta hora conocida cuando birthTimeKnown es true", () => {
    const result = ownProfileRequestSchema.safeParse({
      ...baseInput,
      birthTimeKnown: true,
      birthTime: "14:35",
    });
    expect(result.success).toBe(true);
  });

  it("acepta ausencia de hora cuando birthTimeKnown es false", () => {
    const result = ownProfileRequestSchema.safeParse({
      ...baseInput,
      birthTimeKnown: false,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza birthTimeKnown true sin birthTime", () => {
    const result = ownProfileRequestSchema.safeParse({
      ...baseInput,
      birthTimeKnown: true,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza birthTime cuando birthTimeKnown es false (nunca 12:00 artificial)", () => {
    const result = ownProfileRequestSchema.safeParse({
      ...baseInput,
      birthTimeKnown: false,
      birthTime: "12:00",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza una fecha de nacimiento futura", () => {
    const futureYear = new Date().getFullYear() + 1;
    const result = ownProfileRequestSchema.safeParse({
      ...baseInput,
      birthDate: `${futureYear}-01-01`,
      birthTimeKnown: false,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza un formato de fecha invalido", () => {
    const result = ownProfileRequestSchema.safeParse({
      ...baseInput,
      birthDate: "12/05/1990",
      birthTimeKnown: false,
    });
    expect(result.success).toBe(false);
  });
});
