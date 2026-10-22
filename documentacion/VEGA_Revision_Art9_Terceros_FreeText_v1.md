# VEGA — Revisión Jurídica Interna: Categorías Especiales de Terceros en `free_text` (Art. 9 RGPD) v1

**Estado:** Revisión jurídica interna cerrada (2026-10-11). Conclusión: **CONSULTA EXTERNA RECOMENDADA**.

**Estado actualizado (2026-10-22):** Consulta externa realizada. Resultado: decisión de producto
de eliminar la recogida de `free_text` en Segmento B, sustituyéndola por contexto estructurado
cerrado (`relationship_focus`, `user_emotional_state`, `impact_intensity`), en lugar de sostener
una excepción del art. 9.2 para el subconjunto de terceros identificables descrito en la sección
14. El supuesto concreto que originó esta revisión deja de estar presente en el diseño beta de
Segmento B, al haberse eliminado la recogida de texto libre en ese segmento. **Esto no es una
conclusión general sobre el art. 9 y menciones de terceros en texto libre**, ni implica
cumplimiento jurídico global garantizado para Vega; una futura reintroducción de texto libre en un
contexto con terceros —en Segmento B o en cualquier otro— exigiría una nueva revisión bajo este
mismo marco. Segmento A no se ve afectado: nunca tuvo datos de un tercero en juego, conserva su
`free_text` y consentimiento v2 sin cambios. El análisis jurídico de las secciones 1-15 de este
documento se conserva íntegro como registro histórico del razonamiento que motivó la consulta y la
decisión.

**Naturaleza:** Análisis preparatorio, no vinculante, basado en fuentes oficiales (RGPD/EUR-Lex,
jurisprudencia del TJUE). Distingue **[HECHO]** / **[NORMA/CRITERIO OFICIAL]** (con cita) /
**[INTERPRETACIÓN]** (no vinculante). No sustituye la consulta jurídica externa que esta misma
revisión recomienda.

**Alcance:** esta revisión estudia una única cuestión — las categorías especiales de datos (art.
9.1 RGPD) relativas a terceros que un usuario pueda mencionar en el campo de texto libre
(`free_text`) de Vega. **No reabre:**

- el LIA general del Segmento B (`VEGA_LIA_Segmento_B_v1.md`), cerrado en finalidad, necesidad y
  ponderación;
- el diseño de `free_text` v2 (`VEGA_Consentimiento_FreeText_v1.md`);
- el filtro de identificadores directos (`libs/experiment/direct-identifier-filter.ts`);
- la auditoría de Railway/`vega-api`;
- las retenciones ya implementadas (30 días del núcleo de datos personales).

Esta revisión **no propone medidas adicionales** y **no reabre el principio de producto no
negociable** (`VEGA_Fase_4C_Especificacion_Final_Experimento.md`, sección 0): Vega no debe
bloquear ni clasificar contenido por temática emocional o sensible; las únicas restricciones
automáticas se limitan a identificadores directos innecesarios. Ambas cuestiones —si hace falta
alguna medida adicional, y en qué términos— quedan deliberadamente para después de la consulta
externa que aquí se recomienda.

---

## 1. Metodología y fuentes primarias

Se han usado prioritariamente fuentes oficiales: el texto vigente del RGPD (EUR-Lex) y
jurisprudencia oficial del TJUE (CURIA/EUR-Lex). No se ha encontrado ninguna guía EDPB ni
informe/resolución de la AEPD que trate específicamente el supuesto exacto de Vega — datos de
categoría especial de un tercero no identificado por el responsable, mencionados incidentalmente
por otro usuario en un campo de texto libre de un producto digital. Esta ausencia se trata como un
hallazgo relevante de la propia revisión, no como un vacío que se rellena con fuentes secundarias
(blogs jurídicos, despachos, artículos comerciales).

---

## 2. Hechos jurídicos respaldados por fuente primaria

1. **Art. 9.1 RGPD** prohíbe, salvo excepción, el tratamiento de datos que revelen origen
   racial/étnico, opiniones políticas, convicciones religiosas/filosóficas, afiliación sindical,
   datos genéticos, datos biométricos de identificación única, datos de salud, o datos relativos a
   la vida sexual o la orientación sexual. Lista cerrada.

2. **Art. 9.2 RGPD** — las 10 excepciones, verificadas en su texto íntegro (EUR-Lex): (a)
   consentimiento explícito del interesado; (b) obligaciones/derechos en el ámbito laboral y de
   seguridad social, con base en Derecho de la UE/Estado miembro o convenio colectivo; (c)
   protección de intereses vitales cuando el interesado no puede consentir; (d) tratamiento por una
   entidad sin ánimo de lucro con fines políticos/filosóficos/religiosos/sindicales, limitado a sus
   propios miembros/contactos habituales, sin divulgación externa sin consentimiento; (e) datos
   manifiestamente hechos públicos por el propio interesado; (f) ejercicio o defensa de
   reclamaciones, o actuación de tribunales; (g) interés público esencial, con base legal de la
   UE/Estado miembro, proporcionada y con garantías; (h) medicina preventiva/laboral, diagnóstico,
   prestación de asistencia sanitaria/social, con base legal o contrato con profesional sanitario,
   sujeto al art. 9.3; (i) interés público en salud pública; (j) archivo de interés público,
   investigación científica/histórica o fines estadísticos del art. 89.1.

3. **Art. 4.11 RGPD** — el consentimiento es la manifestación de voluntad del propio interesado; ya
   analizado y cerrado en `VEGA_Base_Juridica_Segmento_B_v1.md` bloque 3 para el supuesto
   estructuralmente idéntico de que el consentimiento de quien introduce el dato no sustituye al
   del tercero. Esta conclusión es directamente transferible al art. 9.2.a, que usa exactamente la
   misma fórmula ("el interesado dio su consentimiento explícito").

4. **Art. 4.1 RGPD y Recital 26** — definición de persona identificable, directa o
   indirectamente; el test debe aplicarse a un receptor concreto con medios razonablemente
   utilizables, no a "cualquier persona del mundo" (ya aplicado y cerrado en
   `VEGA_Datos_Personales_Tercero_Segmento_B_v1.md` bloque 2).

5. **TJUE, *Bodil Lindqvist*, C-101/01, sentencia de 6 de noviembre de 2003** (bajo la Directiva
   95/46/CE, predecesora del RGPD; verificado en el texto oficial de la sentencia vía EUR-Lex):
   - **§24 y §27:** "datos personales" cubre la identificación de una persona "por su nombre o por
     otros medios" (p. ej. un número de teléfono) — no exige nombre completo.
   - **§50:** el concepto de "datos relativos a la salud" debe interpretarse de forma amplia,
     abarcando "tanto los aspectos físicos como mentales" de la salud de una persona.
   - **§51:** la referencia a que una compañera "se había lesionado el pie y estaba de baja parcial
     por motivos médicos" constituye un dato personal relativo a la salud en el sentido del art.
     8.1 de la Directiva (equivalente al art. 9.1 RGPD).
   - **Hecho relevante:** quien reveló el dato fue la propia Sra. Lindqvist (responsable del
     tratamiento), no la compañera afectada; la compañera nunca prestó consentimiento ni fue
     informada.

6. **TJUE, *Meta Platforms y otros*, C-252/21, 4 de julio de 2023** (ya citado y cerrado en
   `VEGA_LIA_Segmento_B_v1.md` bloque 6): el art. 9.1 se activa cuando el tratamiento "revela"
   información de categoría especial, con independencia de la exactitud del dato o de la intención
   del responsable.

7. **TJUE, C-413/23 P (EDPS v SRB), §§84-87** (ya aplicado y cerrado en
   `VEGA_Datos_Personales_Tercero_Segmento_B_v1.md` bloque 5): la identificabilidad es contextual y
   relativa al receptor concreto y a sus medios razonablemente utilizables, no a una posibilidad
   hipotética abstracta.

No se ha localizado ninguna guía EDPB o resolución/informe AEPD que trate específicamente el
supuesto de datos de categoría especial de un tercero no identificado por el responsable,
mencionados incidentalmente por otro usuario en un campo de texto libre de un producto digital.

---

## 3. Análisis de identificabilidad (Art. 4)

**No es una cuestión binaria para todo `free_text`, sino un espectro.** Una mera relación familiar
o de pareja ("mi madre", "mi pareja", "mi hijo") **no implica automáticamente identificabilidad**
— debe distinguirse, y valorarse caso por caso conforme al test contextual:

- **Tercero identificado** (p. ej. "mi pareja Juan tiene depresión"): bajo *Lindqvist* §24/§27, el
  nombre basta — es personal data sin discusión.
- **Tercero indirectamente identificable** (p. ej. detalles suficientemente singularizantes sin
  nombre: profesión rara, localización, combinación de rasgos poco común): aplicando el test
  contextual/relativo de C-413/23 P ya usado para el Segmento B, hay que preguntar si **Vega
  concretamente** —no un tercero hipotético— dispone de medios razonablemente utilizables para
  atribuir el dato a una persona concreta. Con texto libre no estructurado y sin ningún campo
  adicional que lo vincule a una identidad, esto depende del contenido exacto; no es uniforme.
- **Menciones puramente relacionales sin detalles adicionales** ("mi madre", "mi pareja", sin
  más): **pueden no permitir a Vega identificar razonablemente a una persona concreta**, aplicando
  la misma doctrina de C-413/23 P que la propia documentación interna ya usó para rechazar la
  lectura expansiva del Recital 26 ("cualquier persona del mundo, hipotéticamente"). Esto **no se
  afirma categóricamente para todo el subconjunto** — debe valorarse caso por caso conforme al test
  contextual de identificabilidad, porque el mismo texto ("mi pareja") puede ir acompañado, en la
  misma frase o en el resto del relato, de detalles adicionales que sí la singularicen.

**El problema jurídico que estudia esta revisión solo aparece cuando concurren, simultáneamente,
dos condiciones: (1) identificabilidad —efectiva o razonable para Vega— del tercero, y (2)
revelación de una categoría especial del art. 9.1 sobre ese tercero.** Las menciones relacionales
sin identificabilidad razonable, y las menciones identificables que no revelan ninguna categoría
especial, quedan fuera del problema aquí analizado.

Esta distinción no existía con el mismo nivel de precisión en `VEGA_Consentimiento_FreeText_v1.md`,
que trataba el riesgo como un bloque único. Es una aportación de esta revisión, no una reapertura
de lo ya cerrado.

---

## 4. Art. 6 — base jurídica ordinaria (antes de llegar a la categoría especial)

El mismo razonamiento ya cerrado para los datos estructurados del Segmento B es transferible:
6.1.a no aplica (consentimiento ajeno, art. 4.11); 6.1.b no aplica (sin contrato con el tercero);
6.1.f es la única base disponible, con un interés formulable de forma estrecha ("procesar el
contexto que el propio usuario decide compartir para generar la interpretación personalizada que
solicita"). El test de necesidad es, sin embargo, **más débil que en el Segmento B** — ya señalado
en `VEGA_Consentimiento_FreeText_v1.md` sección 1 — porque el texto libre nunca es estrictamente
necesario para el cálculo, a diferencia de los datos de nacimiento.

---

## 5. Art. 9.1 — aplicabilidad

El art. 6.1.f nunca neutraliza el art. 9.1 (ya sentado en `VEGA_Consentimiento_FreeText_v1.md`
sección 1). **El art. 9.1 establece una prohibición de principio cuyo levantamiento exige que
concurra alguna de las excepciones tasadas del art. 9.2; no contiene un balancing test equivalente
al del art. 6.1.f.** La estructura de ambos artículos es acumulativa, no alternativa: satisfacer el
art. 6.1.f no exime de satisfacer, además, el art. 9.2 cuando el dato revela una categoría
especial.

---

## 6. Revisión individual de las excepciones del Art. 9.2

| Excepción | Resultado | Motivo |
|---|---|---|
| (a) Consentimiento explícito | Descartada respecto al tercero | Ver sección 7 — determinación expresa |
| (b) Empleo/Seguridad Social | Descartada | Sin relación alguna con el contexto laboral/SS |
| (c) Intereses vitales | Descartada | No hay escenario de riesgo vital; y aunque lo hubiera, exige que el propio interesado (el tercero) no pueda consentir, no que un tercero hable de él |
| (d) Entidad sin ánimo de lucro | Descartada | Vega es un producto comercial, no una entidad de las descritas, y los terceros mencionados no son "miembros" de nada |
| (e) Dato manifiestamente público | Ver sección 9 — posibilidad ad hoc, no generalizable | — |
| (f) Reclamaciones legales | Descartada | No existe ningún procedimiento judicial o reclamación en curso |
| (g) Interés público esencial | Descartada | No existe ninguna norma de la UE/España que declare este tratamiento de interés público esencial |
| (h) Medicina/asistencia sanitaria | Descartada | Vega no es un profesional ni centro sanitario, no actúa bajo esa base legal/contractual ni bajo secreto profesional del art. 9.3 |
| (i) Salud pública | Descartada | Sin ninguna finalidad de salud pública |
| (j) Archivo/investigación/estadística | Descartada | La finalidad de Vega (interpretación personalizada comercial/experimental) no es investigación científica en el sentido del art. 89.1, que exige garantías específicas no implementadas con ese propósito |

**Resultado de la revisión individual: ninguna de las 10 excepciones del art. 9.2 resulta
generalmente disponible para el subconjunto de menciones de terceros efectivamente identificados o
razonablemente identificables que revelen una categoría especial**, salvo la posibilidad ad hoc no
generalizable de la excepción (e), tratada aparte en la sección 9.

---

## 7. Consentimiento del usuario respecto del tercero — determinación expresa

El consentimiento del usuario **no puede, bajo ninguna lectura del art. 4.11, satisfacer el art.
9.2.a respecto a datos sensibles de otra persona** — es exactamente el mismo defecto estructural ya
identificado para el art. 6.1.a en `VEGA_Base_Juridica_Segmento_B_v1.md` bloque 3, y el propio
checkbox actual ya lo reconoce expresamente ("Este consentimiento no se extiende a información
sensible sobre otras personas"). Esto no es una opinión nueva: es la aplicación directa del mismo
texto legal (art. 4.11) a una fórmula idéntica en el art. 9.2.a. **El art. 6.1.f tampoco sustituye
una excepción del art. 9.2** — son capas independientes y acumulativas (sección 5).

---

## 8. Relevancia de las medidas actuales de diseño

Que Vega no solicite estos datos, que se introduzcan espontáneamente, que no exista clasificación
automática, que se use solo como contexto, con retención limitada: todo esto es **relevante para
el test de necesidad y ponderación del art. 6.1.f** (refuerza esa base), y relevante también para
**reducir, caso por caso, el grado de identificabilidad y por tanto la probabilidad de que el art.
9 llegue a activarse** (sección 3). **Pero ninguno de estos factores es, por sí mismo, una
excepción del art. 9.2** — el art. 9.2 es una lista cerrada y estos factores no figuran en ella. No
sustituyen una base jurídica faltante; reducen la frecuencia e intensidad del problema, no lo
eliminan.

Que Vega no tenga como finalidad crear perfiles médicos/religiosos/sexuales es cierto y relevante
para el art. 22 (ya analizado y descartado en `VEGA_LIA_Segmento_B_v1.md` bloque 7), pero
irrelevante para si el art. 9.1 se activa: *Meta Platforms* (C-252/21) ya establece que la
prohibición opera por la simple "revelación" del dato, con independencia de la intención del
responsable de perfilar o no.

---

## 9. Excepción 9.2.e — posibilidad ad hoc, no utilizable como base general

En teoría aplicable si el hecho revelado por el usuario ya era, de forma manifiesta, público (p.
ej. el tercero ya ha declarado públicamente su propia condición de salud/orientación/religión).
**Pero esto no es una excepción que Vega pueda invocar de forma general ni verificable**: Vega no
tiene manera de comprobar si lo que el usuario relata era ya manifiestamente público o es
información privada — exactamente el mismo problema de "escenario de origen no verificable" ya
identificado y resuelto con un criterio prudente en `VEGA_Analisis_Art14_Segmento_B_v1.md` bloque 6
para el Segmento B. No se propone adoptarla como base general; queda como hipótesis ad hoc, no
resoluble a nivel de diseño de producto.

---

## 10. Argumentos que favorecen la posición de Vega

- El principio de producto no negociable excluye cualquier filtro temático, lo que significa que
  el diseño actual **no agrava deliberadamente el riesgo** — es una decisión consciente de
  UX/producto con una justificación legítima (no penalizar el contexto humano normal), no una
  omisión negligente.
- Minimización ya aplicada: aviso de no incluir identificadores directos de terceros; sin
  clasificación ni indexación por categoría especial; sin perfil separado del tercero; retención
  general de 30 días del núcleo (sin cambios, no se reabre).
- El subconjunto de menciones puramente relacionales sin detalles adicionales puede, caso por caso,
  no llegar a constituir siquiera un dato personal de un tercero para Vega, bajo el propio test
  contextual que la documentación interna ya usó y cerró para el Segmento B (C-413/23 P) — esto
  reduce el universo real del problema, aunque no lo elimina ni permite afirmarlo categóricamente
  (sección 3).
- No existe guía oficial (EDPB/AEPD) que haya calificado expresamente este patrón de producto como
  ilícito; el único precedente directo (*Lindqvist*) es de 2003, bajo la Directiva derogada, y
  sobre un supuesto de publicación pública, no de almacenamiento privado con retención limitada.

## 11. Riesgos / argumentos en contra

- **Diferencia estructural clave con el Segmento B, que no debe minimizarse:** el art. 6.1.f
  (interés legítimo) es un test de ponderación que admite "riesgo residual aceptado y documentado"
  — así se cerró el factor de expectativas razonables del Segmento B. El art. 9.1 funciona de forma
  distinta: establece una prohibición de principio cuyo levantamiento exige que concurra alguna de
  las excepciones tasadas del art. 9.2; no contiene un balancing test equivalente al del art.
  6.1.f. Esto significa que, para el subconjunto de menciones que resulten efectivamente
  identificadas o razonablemente identificables para Vega y que revelen una categoría especial, no
  hay hoy ninguna excepción del art. 9.2 generalmente disponible — ni siquiera parcialmente, a
  diferencia del art. 6.1.f donde sí existe una base aplicable con condiciones.
- *Lindqvist* confirma que el umbral de identificabilidad es bajo (no exige nombre completo) y que
  el concepto de "salud" es amplio (incluye lo mental) — ambos elementos juegan en contra de
  restringir demasiado el subconjunto "no identificable".
- La ausencia de guía EDPB/AEPD específica no es neutral: significa que no hay un criterio oficial
  que respalde expresamente ni la posición de Vega ni su inviabilidad — es incertidumbre genuina,
  no un vacío favorable por omisión.
- El volumen agregado de usuarios reales (a diferencia del Segmento B, que es opcional y de uso
  minoritario) podría ser alto, porque el texto libre es un campo expuesto a todos los usuarios de
  ambos segmentos.

---

## 12. Nivel de confianza

**Moderado.** Alto en los hechos jurídicos de base (texto del art. 9, *Lindqvist*, *Meta
Platforms*, C-413/23 P, todos verificados en fuente primaria). Moderado-bajo en la aplicación al
caso concreto de Vega, por la ausencia verificada de guía oficial directamente aplicable a este
patrón de producto (texto libre con menciones incidentales de terceros no identificados por el
responsable) y por la novedad estructural del supuesto frente a los precedentes disponibles.

---

## 13. Conclusión

**CONSULTA EXTERNA RECOMENDADA**, limitada al subconjunto de menciones de terceros **efectivamente
identificados o razonablemente identificables para Vega que revelen una categoría especial del
art. 9.1**.

No por falta de análisis posible con fuentes oficiales —se ha podido analizar con bastante
profundidad—, sino porque el resultado del análisis es que no existe hoy ninguna excepción del art.
9.2 generalmente disponible para ese subconjunto. El art. 9.1 establece una prohibición de
principio cuyo levantamiento exige que concurra alguna de las excepciones tasadas del art. 9.2; no
contiene un balancing test equivalente al del art. 6.1.f, por lo que no puede cerrarse internamente
del mismo modo que se cerró el factor de expectativas razonables del Segmento B.

Si, tras la consulta, no concurriera ninguna excepción del art. 9.2 para ese subconjunto, esto no
debe presentarse como un riesgo empresarial simplemente asumible: sería una cuestión de licitud, no
de apetito de riesgo. Por ello, la consulta externa debe determinar específicamente:

- si existe una interpretación jurídicamente sostenible, dentro del marco del art. 9.2, para ese
  subconjunto de casos; o
- si, en su defecto, resulta necesaria alguna medida adicional de diseño o de tratamiento para que
  el tratamiento sea lícito.

Esta revisión no propone todavía ninguna de esas medidas ni reabre el principio de producto no
negociable — ambas cuestiones quedan, deliberadamente, para después de la consulta.

---

## 14. Pregunta jurídica externa (versión final aprobada)

> "Un producto digital permite a los usuarios escribir libremente, en un campo de texto opcional,
> el contexto personal de su consulta, sin ninguna restricción ni clasificación automática por
> temática (incluyendo salud, sexualidad, religión o relaciones familiares de terceros), por
> decisión expresa de producto para no penalizar el relato humano normal. Ese texto puede
> incidentalmente contener información sobre una tercera persona que, en un subconjunto de casos,
> resulta efectivamente identificada (p. ej. por su nombre) o razonablemente identificable en el
> contexto real del responsable (p. ej. por una combinación de detalles suficientemente
> singularizante, aun sin nombre) — a diferencia de otro subconjunto de menciones puramente
> relacionales sin detalles adicionales ('mi madre', 'mi pareja', sin más), que pueden no permitir
> a Vega identificar razonablemente a una persona concreta y que, por tanto, deben valorarse caso
> por caso conforme al test contextual de identificabilidad. Para el primer subconjunto
> —identificado o razonablemente identificable—, el tercero no presta consentimiento ni tiene
> conocimiento del tratamiento. Los únicos filtros automáticos del producto restringen
> identificadores directos (email, teléfono, DNI/NIE), nunca contenido por categoría especial. El
> texto se usa solo para generar una interpretación personalizada dirigida al propio usuario, sin
> crear perfiles separados del tercero, sin indexación por categoría especial, con retención
> limitada (30 días) y vinculado solo al identificador técnico del usuario. Para ese subconjunto de
> terceros identificados o razonablemente identificables, ¿concurre alguna excepción del art. 9.2
> RGPD que pueda amparar este tratamiento en las circunstancias descritas? En particular, ¿existe
> alguna interpretación del alcance del art. 9.1 o de alguna de las excepciones del art. 9.2 que
> resulte jurídicamente defendible para este patrón de tratamiento? Si no existe, ¿qué medida
> adicional de diseño o de tratamiento sería necesaria para evitar o hacer lícito ese tratamiento?"

---

## 15. Nota de alcance final

Esta revisión no reabre el principio de producto no negociable, no reabre el LIA del Segmento B, no
reabre `free_text` v2, el filtro de identificadores directos, la auditoría de Railway/`vega-api` ni
las retenciones ya implementadas. No propone ninguna medida adicional de diseño o tratamiento — esa
decisión queda, deliberadamente, para después de recibir la consulta externa aquí recomendada.

No se ha modificado ningún otro archivo.
