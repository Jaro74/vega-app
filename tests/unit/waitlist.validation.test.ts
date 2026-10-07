import { describe, expect, it } from "vitest";

import { waitlistRequestSchema } from "@/libs/validation/waitlist";

const VALID_FLOW_ATTEMPT_ID = "11111111-1111-4111-8111-111111111111";

describe("waitlistRequestSchema", () => {
  it("acepta flowAttemptId + email valido + version de consentimiento", () => {
    const result = waitlistRequestSchema.safeParse({
      flowAttemptId: VALID_FLOW_ATTEMPT_ID,
      email: "usuario@example.com",
      consentVersion: "waitlist_consent_v1",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza un email invalido", () => {
    const result = waitlistRequestSchema.safeParse({
      flowAttemptId: VALID_FLOW_ATTEMPT_ID,
      email: "no-es-un-email",
      consentVersion: "waitlist_consent_v1",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza payload sin consentVersion", () => {
    const result = waitlistRequestSchema.safeParse({
      flowAttemptId: VALID_FLOW_ATTEMPT_ID,
      email: "usuario@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza payload sin flowAttemptId", () => {
    const result = waitlistRequestSchema.safeParse({
      email: "usuario@example.com",
      consentVersion: "waitlist_consent_v1",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza un flowAttemptId que no es un uuid", () => {
    const result = waitlistRequestSchema.safeParse({
      flowAttemptId: "no-es-un-uuid",
      email: "usuario@example.com",
      consentVersion: "waitlist_consent_v1",
    });
    expect(result.success).toBe(false);
  });
});
