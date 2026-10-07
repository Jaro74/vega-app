import { describe, expect, it } from "vitest";

import { segmentRequestSchema } from "@/libs/validation/segment";

describe("segmentRequestSchema", () => {
  it("acepta el segmento A", () => {
    expect(segmentRequestSchema.safeParse({ segment: "A" }).success).toBe(true);
  });

  it("acepta el segmento B", () => {
    expect(segmentRequestSchema.safeParse({ segment: "B" }).success).toBe(true);
  });

  it("rechaza un segmento invalido", () => {
    expect(segmentRequestSchema.safeParse({ segment: "C" }).success).toBe(false);
  });

  it("rechaza un payload sin segmento", () => {
    expect(segmentRequestSchema.safeParse({}).success).toBe(false);
  });
});
