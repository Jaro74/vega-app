import { z } from "zod";

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Fecha valida, formato ISO (YYYY-MM-DD), nunca futura.
// Nunca hardcodear una hora artificial (ej. 12:00) cuando se desconoce:
// eso contaminaria el calculo del motor Vega.
export const birthDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha invalido")
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Fecha invalida",
  })
  .refine((value) => new Date(value).getTime() <= Date.now(), {
    message: "La fecha de nacimiento no puede ser futura",
  });

export const birthTimeSchema = z.string().regex(TIME_REGEX, "Formato de hora invalido");

export const ownProfileRequestSchema = z
  .object({
    flowAttemptId: z.string().uuid(),
    birthDate: birthDateSchema,
    birthTimeKnown: z.boolean(),
    birthTime: birthTimeSchema.optional(),
    placeId: z.number().int().positive(),
  })
  .superRefine((data, ctx) => {
    if (data.birthTimeKnown && !data.birthTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "birthTime es obligatorio cuando birthTimeKnown es true",
        path: ["birthTime"],
      });
    }
    if (!data.birthTimeKnown && data.birthTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "birthTime debe omitirse cuando birthTimeKnown es false",
        path: ["birthTime"],
      });
    }
  });

export type OwnProfileRequestInput = z.infer<typeof ownProfileRequestSchema>;
