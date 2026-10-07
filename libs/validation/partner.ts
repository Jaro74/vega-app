import { z } from "zod";

import type { PartnerPrecision } from "@/types/experiment";

import { birthDateSchema, birthTimeSchema } from "./profile";

// Nunca solicitar nombre, apellido, email, telefono, direccion o cuenta
// social de la segunda persona (VEGA_Fase_4C, seccion "Datos de segunda
// persona"). El schema no tiene ni un solo campo de identidad.
export const partnerRequestSchema = z
  .object({
    flowAttemptId: z.string().uuid(),
    birthDate: birthDateSchema,
    birthTimeKnown: z.boolean().optional(),
    birthTime: birthTimeSchema.optional(),
    placeId: z.number().int().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.birthTimeKnown && !data.birthTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "birthTime es obligatorio cuando birthTimeKnown es true",
        path: ["birthTime"],
      });
    }
    if (data.birthTime && data.birthTimeKnown === false) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "birthTime debe omitirse cuando birthTimeKnown es false",
        path: ["birthTime"],
      });
    }
  });

export type PartnerRequestInput = z.infer<typeof partnerRequestSchema>;

// El nivel de precision lo decide siempre el servidor, nunca el navegador
// (VEGA_Plan_Tecnico, seccion 20). Esta funcion es pura y no llama a Vega:
// solo determina que tipo de solicitud es viable formular al motor.
export function derivePartnerPrecision(
  input: PartnerRequestInput
): PartnerPrecision | "not_viable" {
  const hasFullTime = input.birthTimeKnown === true && Boolean(input.birthTime);
  const hasPlace = typeof input.placeId === "number";

  if (hasFullTime && hasPlace) {
    return "full";
  }
  if (hasPlace) {
    return "partial";
  }
  if (input.birthDate) {
    return "minimal";
  }
  return "not_viable";
}
