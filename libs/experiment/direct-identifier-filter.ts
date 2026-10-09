// Filtro de minimizacion de identificadores directos fuertes en
// problem_context.free_text. Modulo puro, sin dependencia de Next.js ni
// de red: se importa tanto desde el cliente (feedback inmediato en
// ProblemStep) como desde el servidor (comprobacion autoritativa en
// submitProblem, antes de llamar a submitProblemContextWithFreeText) --
// una unica fuente de verdad para ambos, nunca una copia duplicada. El
// servidor sigue siendo la barrera real; el cliente es solo UX.
//
// Deliberadamente NO clasifica contenido ni categorias especiales del
// art. 9 RGPD (salud, orientacion, religion, origen, afiliacion
// sindical, genetica/biometria): bloquear por tema penalizaba el
// contexto humano normal que el experimento necesita ("mi hijo es
// homosexual", "mi pareja tiene depresion", etc. deben poder
// escribirse). Su unica funcion es minimizacion (art. 5.1.c): ningun
// identificador directo fuerte (email, telefono, DNI, NIE) es nunca
// necesario para generar la interpretacion, sea de quien sea, asi que
// basta la deteccion del patron, sin necesitar contexto relacional.
//
// El supuesto de categorias especiales de un tercero identificable
// introducidas en el texto queda como riesgo juridico abierto, sin
// mitigacion tecnica de contenido (ver documentacion/VEGA_Consentimiento_
// FreeText_v1.md) -- Vega no dispone actualmente de una excepcion del
// art. 9.2 que pueda invocar de forma general, predecible y adecuada
// para categorias especiales de terceros introducidas por otro usuario.
//
// No se implementa deteccion de direccion postal completa ni de
// pasaporte: ninguno de los dos tiene un patron suficientemente fiable
// en español para evitar falsos positivos/negativos relevantes.

const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

// Telefono espanol (fijo o movil): exactamente 9 digitos empezando por
// 6/7/8/9, con o sin prefijo internacional, con o sin separadores.
// Revisado explicitamente (2026-10-10) para minimizar falsos positivos
// con numeros normales de una conversacion: la longitud exacta de 9
// digitos y el limite de palabra (\b) en ambos extremos evitan que una
// edad, un año, una cantidad de dinero o un fragmento de un numero mas
// largo disparen el filtro -- ninguno de esos casos tiene tipicamente
// exactamente 9 digitos contiguos empezando por 6-9. Limitacion
// residual aceptada, no resuelta por diseño: dos numeros no
// relacionados escritos sin ningun separador entre si (p. ej. "967" "
// seguido de otro numero de 6 cifras) podrian coincidir casualmente en
// un bloque de 9 digitos que empiece por 6-9 y bloquear sin necesidad
// -- se acepta porque exigir un separador obligatorio perderia el
// formato mas comun de todos (9 digitos pegados, sin espacios), que es
// precisamente el caso real que este filtro existe para detectar.
const PHONE_PATTERN = /(?:\+?\d{1,3}[\s.-]?)?\b[6789]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/;

// DNI: 8 digitos + letra de control.
const DNI_PATTERN = /\b\d{8}[A-Za-z]\b/;

// NIE: X/Y/Z + 7 digitos + letra de control.
const NIE_PATTERN = /\b[XYZxyz]\d{7}[A-Za-z]\b/;

const IDENTIFIER_PATTERNS: Record<string, RegExp> = {
  email: EMAIL_PATTERN,
  phone: PHONE_PATTERN,
  dni: DNI_PATTERN,
  nie: NIE_PATTERN,
};

export interface DirectIdentifierFilterResult {
  blocked: boolean;
  matchedIdentifierTypes: string[];
}

// Nunca devuelve el fragmento de texto que disparo el bloqueo: solo los
// tipos de identificador detectados, para no crear un nuevo sumidero de
// datos personales en logs/telemetria.
export function checkDirectIdentifiers(text: string): DirectIdentifierFilterResult {
  const matchedIdentifierTypes = Object.entries(IDENTIFIER_PATTERNS)
    .filter(([, pattern]) => pattern.test(text))
    .map(([type]) => type);

  return { blocked: matchedIdentifierTypes.length > 0, matchedIdentifierTypes };
}
