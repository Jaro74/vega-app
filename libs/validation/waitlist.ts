import { z } from "zod";

export const waitlistRequestSchema = z.object({
  flowAttemptId: z.string().uuid(),
  email: z.string().email(),
  consentVersion: z.string().min(1),
});

export type WaitlistRequestInput = z.infer<typeof waitlistRequestSchema>;

export const pricedIntentRequestSchema = z.object({
  flowAttemptId: z.string().uuid(),
});

export type PricedIntentRequestInput = z.infer<typeof pricedIntentRequestSchema>;

export const problemRequestSchema = z.object({
  flowAttemptId: z.string().uuid(),
  trigger: z.string().min(1),
  freeText: z.string().max(1000).optional(),
});

export type ProblemRequestInput = z.infer<typeof problemRequestSchema>;
