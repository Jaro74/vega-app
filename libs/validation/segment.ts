import { z } from "zod";

export const segmentRequestSchema = z.object({
  segment: z.enum(["A", "B"]),
});

export type SegmentRequestInput = z.infer<typeof segmentRequestSchema>;
