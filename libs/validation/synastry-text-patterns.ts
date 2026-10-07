import type { SynastryBody } from "@/types/synastry";

// Tablas de deteccion textual usadas por synastry-preview-generation.ts.
// Se separan en su propio archivo para que ese validador quede legible
// (limite de 200 lineas del plan de Sprint 3B) y para que estas listas se
// puedan auditar/ampliar sin tocar la logica de validacion.

function stripAccents(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function normalizeForMatching(text: string): string {
  return stripAccents(text.toLowerCase());
}

// Sinastria v1 no incluye casas de ninguna de las dos personas (motor y
// contrato de Vega, documentacion/VEGA_Resumen_hasta_Sinastria_v1.md,
// seccion 3 "No se implemento... house overlays"): a diferencia de natal,
// esta prohibicion no depende de time_known, es absoluta.
export const HOUSES_PATTERN = /\bcasas?\b/i;

export const ASC_MC_PATTERN = /\bascendente\b|\bmedio\s*cielo\b|\bmc\b/i;

// "su Ascendente" / "el Ascendente de la otra persona" / "de tu pareja":
// atribucion explicita de un angulo a la otra persona (B). Version en
// espejo para "tu Ascendente" (A). Se usan solo cuando el participante
// correspondiente tiene time_known=false, igual que la comprobacion base
// por evidencia (defensa en profundidad, el validador de Vega ya rechaza
// esa evidencia por completo).
export const B_ANGLE_ATTRIBUTION_PATTERN =
  /\bsu\s+(ascendente|medio\s*cielo|mc)\b|\b(ascendente|medio\s*cielo|mc)\s+de\s+(la otra persona|tu pareja|el|ella)\b/i;

export const A_ANGLE_ATTRIBUTION_PATTERN = /\btu\s+(ascendente|medio\s*cielo|mc)\b/i;

// Precision que Vega solo afirma cuando ambos participantes son "full"
// (payload.orbe/fuerza/exacto). Grados explicitos (ej. "3 grados", "2,5°")
// o el termino "orbe"/"exactitud" en el texto sin que la evidencia elegida
// respalde ese dato es la misma falsa precision que se prohibe a nivel de
// payload.
export const EXACT_CLAIM_PATTERN = /\bexact[oa]s?\b|\bexactitud\b/i;
export const ORB_OR_DEGREES_PATTERN = /\borbe\b|\bgrados?\b|\d+([.,]\d+)?\s*°/i;

// Lenguaje fuera de alcance para sinastria v1 (documentacion/
// VEGA_Resumen_hasta_Sinastria_v1.md, seccion 3: "No se implemento...
// scores de compatibilidad... predicciones... claims tipo 'soulmate'";
// encargo Sprint 3B, seccion 6).
export const OUT_OF_SCOPE_CLAIMS_PATTERN =
  /alma\s*gemela|soulmate|almas\s*gemelas|destinad[oa]s|compatibilidad\s*(del|de\s*un)?\s*\d+|\d+\s*%/i;

// Nombres en espanol de cada cuerpo, para detectar de quien habla el
// texto libre generado por el modelo (deteccion de intercambio de roles
// A/B). Con acentos ya retirados por normalizeForMatching.
export const SYNASTRY_BODY_SPANISH_NAMES: Record<SynastryBody, string[]> = {
  sun: ["sol"],
  moon: ["luna"],
  mercury: ["mercurio"],
  venus: ["venus"],
  mars: ["marte"],
  jupiter: ["jupiter"],
  saturn: ["saturno"],
  uranus: ["urano"],
  neptune: ["neptuno"],
  pluto: ["pluton"],
  north_node: ["nodo norte", "nodo lunar"],
  lilith_mean: ["lilith"],
  asc: ["ascendente"],
  mc: ["medio cielo"],
};

// "tu <cuerpo>": el texto atribuye ese cuerpo a la persona A (quien
// escribe). Usado para detectar si el modelo intercambio los roles
// direccionales (ej. describe un Marte que en allowed_evidence es
// person_b_body como si fuera "tu Marte").
export function textAttributesBodyToA(text: string, spanishName: string): boolean {
  const normalized = normalizeForMatching(text);
  return new RegExp(`\\btu\\s+${spanishName}\\b`, "i").test(normalized);
}

// "su <cuerpo>" / "<cuerpo> de la otra persona" / "de tu pareja": el
// texto atribuye ese cuerpo a la persona B.
export function textAttributesBodyToB(text: string, spanishName: string): boolean {
  const normalized = normalizeForMatching(text);
  return (
    new RegExp(`\\bsu\\s+${spanishName}\\b`, "i").test(normalized) ||
    new RegExp(`\\b${spanishName}\\s+de\\s+(la otra persona|tu pareja|el|ella)\\b`, "i").test(normalized)
  );
}
