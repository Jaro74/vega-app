import { z } from "zod";

// Shape "wire" (snake_case) tal cual lo devuelve POST /evidence/natal.
// Solo valida estructura; las reglas semanticas (versions exactas,
// provenance, chart_id consistente, coherencia con time_known) viven en
// client.ts porque necesitan comparar varios campos entre si.
const vegaEvidenceItemWireSchema = z.object({
  id: z.string().min(1),
  schema_version: z.string().min(1),
  facts_version: z.string().min(1),
  claims_version: z.string().min(1),
  chart_id: z.string().min(1),
  kind: z.string().min(1),
  // string (un cuerpo), array (relacion entre varios, ej. aspectos) o
  // null (claim sin cuerpo asociado, ej. patrones/balance elemental) --
  // forma real observada contra la API en Railway (gate Sprint 3A).
  subject: z.union([z.string(), z.array(z.string()), z.null()]),
  payload: z.record(z.string(), z.unknown()),
  provenance: z.object({ source: z.string().min(1) }).passthrough(),
});

export const vegaNatalResponseWireSchema = z.object({
  request_id: z.string().min(1),
  chart_id: z.string().min(1),
  versions: z.object({
    facts: z.string().min(1),
    claims: z.string().min(1),
    evidence_schema: z.string().min(1),
  }),
  time_context: z.object({ time_known: z.boolean() }),
  allowed_evidence: z.array(vegaEvidenceItemWireSchema),
});

export type VegaNatalResponseWire = z.infer<typeof vegaNatalResponseWireSchema>;
