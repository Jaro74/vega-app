// Filtro heuristico de categorias especiales (art. 9 RGPD) de terceros
// en problem_context.free_text. Modulo puro, sin dependencia de
// Next.js ni de red: se importa tanto desde el cliente (feedback
// inmediato en ProblemStep) como desde el servidor (comprobacion
// autoritativa en submitProblem, antes de llamar a
// submitProblemContextWithFreeText) -- una unica fuente de verdad para
// ambos, nunca una copia duplicada.
//
// Deliberadamente heuristico, no exhaustivo: bloquea solo cuando
// coexisten un termino de categoria especial Y un marcador de tercera
// persona en el mismo texto, para limitar falsos positivos. Esto
// REDUCE la frecuencia de datos sensibles de terceros sin eliminarla
// -- un falso negativo sigue siendo tratamiento sin excepcion del art.
// 9.2 disponible (Vega no dispone de una excepcion del art. 9.2 que
// pueda invocar de forma general, predecible y adecuada para
// categorias especiales de terceros introducidas por otro usuario).

const SPECIAL_CATEGORY_TERMS: Record<string, string[]> = {
  salud: ["enfermedad", "enferma", "enfermo", "diagnostico", "diagnosticada", "diagnosticado", "depresion", "ansiedad", "trastorno", "medicacion", "terapia psiquiatrica", "vih", "cancer", "discapacidad"],
  orientacion_vida_sexual: ["homosexual", "heterosexual", "bisexual", "lesbiana", "gay", "transexual", "orientacion sexual", "vida sexual"],
  religion_creencias: ["catolico", "catolica", "musulman", "musulmana", "judio", "judia", "ateo", "atea", "creyente", "religion", "cristiano", "cristiana"],
  origen_racial_etnico: ["origen racial", "origen etnico", "etnia", "gitano", "gitana", "raza"],
  afiliacion_sindical: ["sindicato", "afiliacion sindical", "sindicalista"],
  genetico_biometrico: ["adn", "genetico", "genetica", "huella dactilar", "biometrico", "biometrica"],
};

const THIRD_PERSON_MARKERS = [
  "mi pareja",
  "mi novio",
  "mi novia",
  "mi marido",
  "mi mujer",
  "mi esposo",
  "mi esposa",
  "mi hijo",
  "mi hija",
  "mi madre",
  "mi padre",
  "mi hermano",
  "mi hermana",
  "mi amigo",
  "mi amiga",
  "mi ex",
  " el ",
  " ella ",
  " su ",
];

function normalize(text: string): string {
  return ` ${text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")} `;
}

function containsAny(normalizedText: string, terms: string[]): boolean {
  return terms.some((term) => normalizedText.includes(term));
}

export interface ThirdPartySensitiveTextFilterResult {
  blocked: boolean;
  matchedCategories: string[];
}

// Nunca devuelve el fragmento de texto que disparo el bloqueo: solo las
// categorias afectadas, para no crear un nuevo sumidero de datos
// sensibles en logs/telemetria.
export function checkThirdPartySensitiveText(text: string): ThirdPartySensitiveTextFilterResult {
  const normalized = normalize(text);
  const hasThirdPersonMarker = containsAny(normalized, THIRD_PERSON_MARKERS);

  if (!hasThirdPersonMarker) {
    return { blocked: false, matchedCategories: [] };
  }

  const matchedCategories = Object.entries(SPECIAL_CATEGORY_TERMS)
    .filter(([, terms]) => containsAny(normalized, terms))
    .map(([category]) => category);

  return { blocked: matchedCategories.length > 0, matchedCategories };
}
