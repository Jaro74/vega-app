import { z } from "zod";

import { SYNASTRY_ASPECT_TYPES, SYNASTRY_BODIES } from "@/types/synastry";

// Shape "wire" (snake_case) tal cual lo devuelve POST /evidence/synastry,
// verificado directamente contra Railway (gate Sprint 3B: full/full,
// full/partial, partial/partial, minimal). Solo valida estructura; las
// reglas semanticas (versions exactas, provenance, coherencia de
// precision/hora, falsa precision, IDs unicos y bien formados) viven en
// synastry-client.ts porque necesitan comparar varios campos entre si.
const synastryEvidencePayloadWireSchema = z
  .object({
    type: z.enum(SYNASTRY_ASPECT_TYPES),
    toca_luminaria: z.boolean(),
    toca_angulo: z.boolean(),
    orbe_max: z.number(),
    orbe: z.number().optional(),
    fuerza: z.number().optional(),
    exacto: z.boolean().optional(),
  })
  .passthrough();

const synastryEvidenceItemWireSchema = z.object({
  id: z.string().min(1),
  syn_evidence_schema_version: z.string().min(1),
  syn_facts_version: z.string().min(1),
  syn_claims_version: z.string().min(1),
  facts_version: z.string().min(1),
  chart_id_a: z.string().min(1),
  chart_id_b: z.string().min(1),
  kind: z.string().min(1),
  subject: z.object({
    person_a_body: z.enum(SYNASTRY_BODIES),
    person_b_body: z.enum(SYNASTRY_BODIES),
  }),
  payload: synastryEvidencePayloadWireSchema,
  provenance: z.object({ source: z.string().min(1) }).passthrough(),
});

const synastryOkResponseWireSchema = z.object({
  status: z.literal("ok"),
  request_id: z.string().min(1),
  chart_id_a: z.string().min(1),
  chart_id_b: z.string().min(1),
  versions: z.object({
    facts: z.string().min(1),
    synastry_facts: z.string().min(1),
    synastry_claims: z.string().min(1),
    synastry_evidence_schema: z.string().min(1),
  }),
  time_context: z.object({
    time_known_a: z.boolean(),
    time_known_b: z.boolean(),
  }),
  // "minimal" nunca es valido aqui: Vega siempre baja a insufficient_data
  // en ese caso (verificado contra Railway). Restringir el schema a
  // full/partial hace que una respuesta "ok" con precision "minimal" sea
  // rechazada como invalid_schema, no aceptada silenciosamente.
  precision: z.object({
    a: z.enum(["full", "partial"]),
    b: z.enum(["full", "partial"]),
  }),
  allowed_evidence: z.array(synastryEvidenceItemWireSchema),
});

const synastryInsufficientDataResponseWireSchema = z.object({
  status: z.literal("insufficient_data"),
  request_id: z.string().min(1),
  insufficient_participants: z.array(z.enum(["a", "b"])).min(1),
});

export const vegaSynastryResponseWireSchema = z.discriminatedUnion("status", [
  synastryOkResponseWireSchema,
  synastryInsufficientDataResponseWireSchema,
]);

export type VegaSynastryResponseWire = z.infer<typeof vegaSynastryResponseWireSchema>;
export type VegaSynastryOkResponseWire = z.infer<typeof synastryOkResponseWireSchema>;
