# VEGA — Revisión Jurídica Interna: Suficiencia del Checkbox Único para Art. 6.1.a + Art. 9.2.a (datos sensibles del propio usuario) v1

**Estado:** Revisión jurídica interna cerrada (2026-10-11). Conclusión: **CERRABLE
INTERNAMENTE**. No activa consulta jurídica externa.

**Naturaleza:** Análisis preparatorio, no vinculante, basado en fuentes oficiales (RGPD/EUR-Lex,
EDPB). Distingue **[HECHO]** / **[NORMA/CRITERIO OFICIAL]** (con cita) / **[INTERPRETACIÓN]** (no
vinculante).

**Alcance:** esta revisión estudia una única cuestión — si el checkbox único de `free_text` puede
constituir simultáneamente consentimiento válido del art. 6.1.a (tratamiento ordinario del texto)
y consentimiento explícito del art. 9.2.a (categorías especiales que el propio usuario decida
incluir sobre sí mismo), o si el RGPD/EDPB exige una acción o consentimiento separado. **No trata
las categorías especiales relativas a terceros**, ya escaladas a consulta externa en
`VEGA_Revision_Art9_Terceros_FreeText_v1.md`. **No reabre:** el principio de producto no
negociable; el filtro de identificadores directos; el Segmento B/LIA; las retenciones ya
implementadas; la implementación de `free_text` v2; ni el plazo de conservación probatoria de
`free_text_consent_events` (cuestión distinta, pendiente de revisión interna aparte). **No
propone ningún cambio de código** — el único hallazgo con relevancia operativa (sección 7) se
deja documentado como acción pendiente, sin ejecutarla aquí.

---

## 1. Contexto real de Vega

- `free_text` es opcional; el usuario puede continuar y obtener la experiencia completa sin
  utilizarlo.
- Si lo utiliza, Vega procesa literalmente ese texto para generar una interpretación
  personalizada.
- El usuario puede incluir voluntariamente información sensible sobre sí mismo.
- Checkbox actual: *"Doy mi consentimiento para que Vega trate el texto que he escrito para
  generar mi interpretación personalizada, incluida cualquier información sensible sobre mí que
  decida compartir. Este consentimiento no se extiende a información sensible sobre otras
  personas."*
- Aviso previo: *"Este campo es opcional. Cuéntanos solo lo necesario para entender tu situación.
  Evita incluir datos de contacto, documentos de identidad, direcciones u otros datos que permitan
  identificar directamente a otras personas."*
- Aviso de retirada: *"Puedes retirar este consentimiento en cualquier momento desde 'Mis
  datos'."*
- Sin marcar el checkbox no se procesa `free_text`. La retirada posterior borra el `free_text` y
  las previews generadas con él, conforme al diseño ya implementado (no se reabre aquí).

---

## 2. Fuente primaria principal

**EDPB, Guidelines 05/2020 on consent under Regulation 2016/679, versión 1.1** (actualización de
las WP29 Guidelines WP259 rev.01, endosadas por el EDPB) — descargadas directamente de
`edpb.europa.eu` y verificadas párrafo por párrafo, no citadas de memoria ni de fuentes
secundarias.

---

## 3. Requisitos generales del consentimiento (Art. 4.11 y Art. 7 RGPD)

Libre, específico, informado, inequívoco, demostrable, revocable — ya establecidos en revisiones
previas de este proyecto (`VEGA_Base_Juridica_Segmento_B_v1.md` bloque 3). Esta revisión aplica
esos mismos requisitos al checkbox de `free_text`.

---

## 4. Consentimiento explícito (Art. 9.2.a) según EDPB Guidelines 05/2020

**[NORMA/CRITERIO OFICIAL]**

- **§92:** un "statement or clear affirmative action" es el estándar del consentimiento
  "ordinario" (6.1.a); "explícito" exige algo más en la forma de expresión.
- **§93:** "explícito" se refiere a **cómo se expresa** el consentimiento — el interesado debe
  emitir una declaración expresa de consentimiento. Una declaración escrita firmada es "una forma
  obvia" de conseguirlo, **no la única**.
- **§94:** una declaración firmada **no es la única vía**; en contexto digital, rellenar un
  formulario electrónico, enviar un email, o cualquier medio que deje constancia de una
  declaración expresa puede bastar. El uso de declaraciones orales también puede ser
  suficientemente expreso, aunque más difícil de demostrar.
- **§96 (Ejemplo 17):** el EDPB da como ejemplo de consentimiento explícito válido una pantalla con
  checkboxes "Sí"/"No", **siempre que el texto indique claramente el consentimiento** (p. ej. "I,
  hereby, consent to the processing of my data"), y no una fórmula pasiva o ambigua (p. ej. "It is
  clear to me that my data will be processed").
- **§97-98:** firma electrónica y verificación en dos pasos se presentan como **opciones
  adicionales para escenarios de mayor riesgo** (p. ej. transferencia de un historial médico a un
  tercero para una segunda opinión), no como un requisito general.
- **§99:** si ninguna de las excepciones (b)-(j) del art. 9.2 aplica, el consentimiento explícito
  es la única excepción lícita posible.

**[INTERPRETACIÓN]** **El EDPB confirma que el consentimiento explícito puede obtenerse
digitalmente mediante una declaración afirmativa expresa; no exige, como regla general, firma,
doble acción ni un segundo consentimiento separado.** No se afirma que el Ejemplo 17 valide
literalmente una interfaz idéntica a la de Vega — el EDPB ilustra el estándar con un ejemplo propio
(una pantalla de checkboxes Sí/No), no con el diseño exacto de ningún producto concreto. Lo que sí
es aplicable es el **estándar que ese ejemplo ilustra**: una declaración afirmativa, expresa y en
primera persona, sin necesidad de firma ni verificación adicional. El checkbox de Vega ("Doy mi
consentimiento para que Vega trate el texto que he escrito...") es, bajo ese estándar, una
declaración afirmativa expresa — no una fórmula pasiva o ambigua del tipo que el EDPB rechaza — y
es, por tanto, compatible con el estándar de "explícito" sin necesitar una segunda acción.

---

## 5. Análisis de granularidad

**[NORMA/CRITERIO OFICIAL]**

- **§42:** la granularidad se activa cuando un servicio implica "múltiples operaciones de
  tratamiento para más de una finalidad."
- **§43, citando Recital 43 RGPD:** el consentimiento se presume no libremente otorgado si no
  permite consentir por separado a operaciones de tratamiento distintas, cuando sea apropiado.
  Citando Recital 32 RGPD: "el consentimiento debe cubrir todas las actividades de tratamiento
  realizadas para la misma finalidad o finalidades. Cuando el tratamiento tenga varios fines, debe
  darse el consentimiento para todos ellos."
- **§44-45 (Ejemplo 7):** el ejemplo de falta de granularidad que ofrece el EDPB es, explícitamente,
  de **dos finalidades distintas** (marketing por email + compartir datos con otras empresas del
  grupo) bajo un único consentimiento.

**[INTERPRETACIÓN]** La doctrina de granularidad del EDPB distingue entre:

- **Múltiples finalidades** → exige consentimiento separado por finalidad (el supuesto que el
  EDPB regula y ejemplifica).
- **Múltiples fundamentos jurídicos para una misma finalidad** → no es el supuesto regulado por la
  granularidad; el propio Recital 32, citado por el EDPB, respalda en sentido contrario que un
  consentimiento puede y debe cubrir todas las actividades de tratamiento de una misma finalidad.

En Vega, el art. 6.1.a y el art. 9.2.a no corresponden a dos finalidades distintas, sino a dos
fundamentos jurídicos que pueden aplicar, según el contenido concreto del texto, a la **misma**
finalidad única: tratar el texto para generar la interpretación personalizada. No se ha localizado,
en la fuente primaria revisada, ninguna base para exigir una segunda acción de consentimiento por
ese motivo. **Granularidad no infringida.**

---

## 6. Carácter libre del consentimiento

**[NORMA/CRITERIO OFICIAL]**

- **§89:** si el consentimiento se agrupa como parte no negociable de unos términos y condiciones,
  se presume que no fue libremente otorgado.
- **§100 (Ejemplo 19, Holiday Airways):** una aerolínea pide datos de salud para prestar asistencia
  de viaje; el vuelo sigue disponible sin esa asistencia; el EDPB concluye expresamente que, al ser
  los datos necesarios únicamente para el servicio solicitado y existir una alternativa sin ellos,
  "Article 7(4) does not apply."
- **§101-102 (Ejemplo 20):** una empresa de gafas a medida pide datos de salud (graduación) para un
  producto personalizado, pero ofrece una alternativa estándar sin compartir esos datos; el EDPB
  concluye que "an explicit consent under Article 9 is required and consent can be considered to
  be freely given."

**[INTERPRETACIÓN]** `free_text` es opcional y el usuario obtiene la experiencia completa (la
interpretación personalizada) sin usarlo — la misma estructura que los Ejemplos 19 y 20, donde el
EDPB descarta expresamente el art. 7.4 y califica el consentimiento de libre. **Consentimiento
libre por ser `free_text` opcional, con alternativa funcional completa sin él.**

---

## 7. Información

**[NORMA/CRITERIO OFICIAL]** El EDPB (§64-67) identifica el **contenido mínimo exigible para que
el consentimiento sea informado**: (i) identidad del responsable; (ii) la finalidad de cada
operación de tratamiento para la que se solicita consentimiento; (iii) qué datos se recogen y
usan; (iv) la existencia del derecho de retirada; (v) el uso en decisiones automatizadas del art.
22.2.c, cuando sea relevante; (vi) los riesgos de transferencias internacionales sin garantías
adecuadas, cuando sea relevante. El **§67, nota 42**, señala que si la identidad del responsable o
la finalidad no son evidentes en la primera capa de información, es difícil demostrar que el
consentimiento fue informado, salvo que el responsable pueda probar que el interesado accedió a
esa información antes de consentir.

**[INTERPRETACIÓN]** Aplicado a Vega:

- (ii) finalidad y (iii) qué datos: cubiertos con razonable claridad por el aviso previo y el
  propio checkbox.
- (iv) derecho de retirada: cubierto por el aviso de retirada ("Mis datos").
- (v) decisiones automatizadas: no aplica — ya descartado en el LIA del Segmento B, no se reabre.
- (i) identidad del responsable y (vi) riesgos de transferencias: **pertenecen correctamente a la
  Privacy Policy**, no al checkbox puntual — el EDPB no exige repetir esos elementos en cada acción
  de consentimiento concreta, siempre que sean accesibles antes de consentir.

**[HECHO, verificado en el código, solo lectura]** `components/experiment/flow/ProblemStep.tsx`
(donde vive el checkbox de `free_text`) **no enlaza actualmente la Privacy Policy** en esa
pantalla, a diferencia de `components/experiment/flow/WaitlistStep.tsx`, que sí lo hace. Bajo la
nota 42 del §67, esto no invalida el consentimiento ya obtenido, pero sí debilita la capacidad de
**demostrar** que el elemento (i) (identidad del responsable) fue efectivamente accesible antes de
consentir en esa pantalla concreta.

**Clasificación de este hallazgo:** **medida de cierre recomendada antes del GO — no una necesidad
de añadir otro checkbox ni de rediseñar `free_text`.** Su finalidad es reforzar la demostrabilidad
de que el consentimiento era informado, en particular respecto a la identidad del responsable y la
información completa del tratamiento — no corregir ningún defecto estructural del mecanismo de
consentimiento en sí, que ya se considera válido (secciones 4-6). Esta revisión no modifica
`ProblemStep.tsx`; deja el hallazgo documentado como acción pendiente.

---

## 8. Demostrabilidad

**[NORMA/CRITERIO OFICIAL]** **§105-107, citando Recital 42 RGPD:** cuando el tratamiento se basa
en el consentimiento, el responsable debe poder demostrar que el interesado consintió. El RGPD no
prescribe una forma concreta; el responsable debe tener datos suficientes para mostrar el vínculo
con el tratamiento, sin recoger más información de la necesaria.

**[INTERPRETACIÓN]** El versionado de `free_text_consent_versions` (catálogo del texto exacto por
versión) y el registro append-only de eventos `granted`/`withdrawn`/`expired` en
`free_text_consent_events` son, en su diseño, coherentes con lo que el EDPB exige: permiten
mostrar qué texto exacto se presentó y qué acción tomó el usuario, sin recoger datos adicionales
innecesarios. **Versionado/eventos adecuados para demostrabilidad.** El plazo de conservación de
esa prueba (12 meses, calificado como "provisional" en `VEGA_Consentimiento_FreeText_v1.md`) es una
cuestión distinta, ya señalada aparte como pendiente de revisión interna, y **queda fuera de
alcance de esta revisión.**

---

## 9. Análisis del segundo checkbox

**[INTERPRETACIÓN]** Ni el art. 9.2.a ni las Guidelines 05/2020 del EDPB exigen una segunda acción
de consentimiento cuando una única declaración afirmativa, suficientemente expresa, cubre una
misma finalidad que puede implicar datos ordinarios y, ocasionalmente, datos de categoría especial
del propio interesado (secciones 4-5). Un segundo checkbox podría considerarse una mejora de
claridad/UX (por ejemplo, nombrar expresamente alguna categoría especial en lugar de la fórmula
genérica actual), pero eso es una decisión de redacción, no una obligación jurídica derivada de las
fuentes revisadas.

**Clasificación: INNECESARIO como exigencia normativa.**

---

## 10. Argumentos a favor de la suficiencia del checkbox actual

- El estándar de "explícito" que el EDPB ilustra con su Ejemplo 17 (declaración afirmativa expresa,
  sin firma ni verificación adicional) es compatible con el mecanismo de Vega, sin que esto
  implique que el EDPB validó una interfaz idéntica.
- El supuesto de granularidad del EDPB está definido y ejemplificado para múltiples finalidades,
  no para múltiples fundamentos jurídicos de una misma finalidad.
- El carácter opcional de `free_text`, con la experiencia completa disponible sin usarlo, replica
  la estructura de los Ejemplos 19 y 20 del EDPB, donde el consentimiento se declara libre.
- El checkbox ya distingue expresamente el alcance respecto a terceros ("Este consentimiento no se
  extiende a información sensible sobre otras personas"), reforzando la especificidad exigida.
- El mecanismo de retirada (`/mis-datos`, con borrado del texto y de las previews que lo usaron)
  satisface la revocabilidad del art. 7.3 — ya verificado en el diseño técnico, no se reabre.

## 11. Argumentos/riesgos en contra

- No se ha localizado ninguna guía EDPB, AEPD ni jurisprudencia del TJUE que trate exactamente el
  supuesto de un único checkbox cubriendo simultáneamente 6.1.a y 9.2.a para la misma finalidad —
  la conclusión se apoya en una lectura razonada de los criterios existentes (granularidad por
  finalidad, no por fundamento), no en un precedente que resuelva este punto de forma expresa.
- El checkbox no menciona expresamente "categoría especial" ni el art. 9 — el EDPB no exige esa
  mención literal, pero su ausencia podría, en una revisión más estricta, debilitar el argumento de
  que el usuario comprendió que prestaba un consentimiento "reforzado" distinto del ordinario.
- La ausencia de enlace a la Privacy Policy en `ProblemStep.tsx` (sección 7) es un punto débil para
  demostrar el elemento (i) de "informado" si se exige con rigor, aunque subsanable con un simple
  enlace, no con un rediseño del consentimiento.

---

## 12. Nivel de confianza

**Alto.** A diferencia de la revisión sobre terceros en `free_text` (sin guía EDPB/AEPD
directamente aplicable), aquí se ha localizado y verificado una fuente primaria oficial —las
propias Guidelines 05/2020 del EDPB— que trata expresamente los tres puntos centrales de esta
pregunta: qué significa "explícito", qué es granularidad y por qué no se activa aquí, y qué
significa "libre" para una función opcional con alternativa disponible. El único punto de
confianza moderada es el hallazgo factual sobre el enlace ausente a la Privacy Policy, que no es
una incertidumbre sobre el derecho aplicable, sino una medida de cierre recomendada.

---

## 13. Conclusión

**CERRABLE INTERNAMENTE.** No activa consulta jurídica externa.

- **Una sola finalidad:** 6.1.a y 9.2.a se aplican a la misma finalidad (tratar el texto para
  generar la interpretación), no a finalidades distintas.
- **Granularidad no infringida.**
- **Consentimiento libre** por ser `free_text` opcional, con alternativa funcional completa sin
  él.
- **Consentimiento explícito suficientemente expresado** — el EDPB confirma que el consentimiento
  explícito puede obtenerse digitalmente mediante una declaración afirmativa expresa, sin exigir,
  como regla general, firma, doble acción ni un segundo consentimiento separado.
- **Versionado/eventos adecuados para demostrabilidad** — el plazo de conservación de esa prueba
  queda fuera de alcance de esta revisión.
- **Segundo checkbox: INNECESARIO como exigencia normativa.**
- **Enlace a la Privacy Policy desde `ProblemStep.tsx`: medida de cierre recomendada antes del
  GO**, para reforzar la demostrabilidad de que el consentimiento era informado (identidad del
  responsable e información completa del tratamiento) — no una necesidad de añadir otro checkbox
  ni de rediseñar `free_text`. No se ejecuta en esta revisión.

No se ha modificado ningún archivo de código.
