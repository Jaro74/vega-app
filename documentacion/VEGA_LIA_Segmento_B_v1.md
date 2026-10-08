# LIA (Legitimate Interests Assessment) — Segmento B de Vega v1

**Naturaleza:** Análisis preparatorio, no vinculante, basado en fuentes oficiales (RGPD/EUR-Lex, EDPB, AEPD, jurisprudencia del TJUE) y en la documentación técnica interna ya verificada. En cada apartado se distingue: **[HECHO]**, **[NORMA/CRITERIO OFICIAL]** (con cita) e **[INTERPRETACIÓN]** (no vinculante). No sustituye la revisión jurídica externa ya solicitada en `VEGA_Paquete_Revision_Juridica_Externa_v1.md`.

---

## 1. Hechos del tratamiento

- **Quién aporta los datos:** el usuario principal, no la segunda persona. La segunda persona no interactúa con Vega en ningún momento.
- **Datos tratados sobre la segunda persona:** fecha de nacimiento; hora (solo si se conoce); lugar de nacimiento (con coordenadas); zona horaria.
- **Datos NO solicitados:** nombre, apellidos, email, teléfono, dirección postal, identificadores de cuenta o red social.
- **Finalidad declarada:** calcular una lectura de sinastría dentro de un experimento de validación de producto, sin cobro real.
- **Supabase:** datos de nacimiento en bruto, vinculados solo a un identificador técnico del intento de flujo.
- **Railway:** fecha, hora, zona horaria y coordenadas de ambas personas; ningún identificador interno del experimento.
- **OpenAI:** categoría del motivo, texto breve opcional, indicadores de precisión, evidencia astrológica ya calculada — nunca datos en bruto.
- **PostHog:** nada de lo anterior; solo categorías técnicas del experimento.
- **Retención:** dato en bruto — borrado inmediato, máximo técnico de 1 hora como fallback (hasta ~2 horas reales por la cadencia horaria del cron de limpieza), reducido desde 24 horas el 2026-10-07; resultado derivado — vigencia de 24 horas (reducida desde 30 días el 2026-10-07), exclusivamente para continuidad/reintentos de corto plazo; tras esas 24h no se reutiliza (verificado en el propio código de lectura), con eliminación física en el siguiente ciclo de purga horario dedicado (hasta ~1h de margen adicional) — ver `VEGA_Base_Juridica_Segmento_B_v1.md`.
- **Consentimiento/conocimiento de la segunda persona:** no existe ningún mecanismo de registro o verificación; no tiene vía práctica de enterarse del tratamiento.
- **Estado del tráfico:** suspendido, solo tráfico de prueba.

---

## 2. Test de finalidad

**[NORMA/CRITERIO OFICIAL]** Art. 6.1.f RGPD; EDPB Guidelines 1/2024 (versión sometida a consulta pública, 8-10-2024, consulta cerrada — ver nota de confianza al final): interés real, concreto, no especulativo; no basta con que el tratamiento sea meramente beneficioso para el responsable.

**[INTERPRETACIÓN]** El interés legítimo defendible es "prestar el servicio concreto de sinastría solicitado activamente por un usuario, usando el mínimo de datos de un tercero necesarios para ese cálculo puntual" — no el interés comercial general del experimento. Debe documentarse formalmente en esos términos estrechos antes de invocar el art. 6.1.f.

---

## 3. Test de necesidad

Superado para el núcleo estructurado de datos de nacimiento (minimización ya al mínimo funcional: sin alternativa razonable con menos campos sin degradar la funcionalidad central). Más débil para el campo de texto libre, que no es estrictamente necesario para el cálculo de la segunda persona. El diseño de borrado inmediato + fallback de 1h (reducido desde 24h el 2026-10-07) refuerza, no debilita, este test.

---

## 4. Test de ponderación

**[INTERPRETACIÓN]** Factores favorables al responsable: minimización, retención, pseudonimización, ausencia de identificadores directos en todos los proveedores. Factor desfavorable, y el más débil del conjunto: la segunda persona no tiene relación con Vega, no puede razonablemente esperar ese tratamiento (Recital 47 RGPD), y no tiene vía práctica de conocerlo. El resultado de la ponderación no es unívoco — ver conclusión en el bloque 9.

---

## 5. Artículo 14 RGPD

**[NORMA/CRITERIO OFICIAL]** Art. 14.1-14.4 RGPD: obligación de informar cuando los datos no se obtienen del interesado, dentro de plazos definidos (art. 14.3). Art. 14.5.b: excepción cuando facilitar la información "resulte imposible o exigiera un esfuerzo desproporcionado", sujeta a que el responsable adopte medidas adecuadas, incluida la puesta a disposición pública de la información. El EDPB señala que esta excepción debe interpretarse de forma **restrictiva**, con un **umbral alto** para su aplicación — no es una excepción de aplicación automática ni amplia.

**[INTERPRETACIÓN]**

- El art. 14 aplica en principio: los datos de la segunda persona no se obtienen de ella.
- Qué habría que facilitar: identidad del responsable, finalidad, base jurídica, plazo de conservación, destinatarios, origen de los datos, derechos — hoy no satisfecho, ni individualmente (no hay dato de contacto de la segunda persona) ni mediante una vía general equivalente (la política pública no contiene hoy información específica sobre el segmento B).
- **Sobre la posible excepción del art. 14.5.b:** es una hipótesis que podría estudiarse, no una conclusión. La ausencia deliberada de datos de contacto de la segunda persona puede formar parte del análisis de minimización del tratamiento, **pero no demuestra por sí misma que la excepción resulte aplicable**. El criterio oficial del EDPB es que el umbral de "imposibilidad o esfuerzo desproporcionado" es alto y debe aplicarse restrictivamente; no basta con que el propio diseño del producto haga la información individualizada impracticable — eso podría, en su caso, discutirse como un indicio a valorar, no como la demostración de que el umbral está superado.
- Si se invocara la excepción, exigiría además, como mínimo, medidas sustitutivas adecuadas (p. ej. información general accesible en la política pública sobre el tratamiento del segmento B), que hoy tampoco existen.
- **No se concluye que la excepción aplica.** Esta sigue siendo la pregunta 3 de las seis preguntas originales del segmento B (apartado B. Segmento B de `VEGA_Paquete_Revision_Juridica_Externa_v1.md`) — la decisión corresponde a esa revisión, no a este LIA.

---

## 6. Artículo 9 RGPD

**[NORMA/CRITERIO OFICIAL]** El art. 9.1 RGPD prohíbe, salvo excepción, el tratamiento de datos que revelen origen racial o étnico, opiniones políticas, convicciones religiosas o filosóficas, afiliación sindical, datos genéticos, datos biométricos dirigidos a identificar de manera única a una persona, datos relativos a la salud, o datos relativos a la vida sexual o la orientación sexual. Es una lista cerrada.

**Los datos relativos a condenas e infracciones penales no forman parte de esta lista: están regulados separadamente por el art. 10 RGPD**, que impone un régimen propio (tratamiento solo bajo control de autoridad pública o cuando lo autorice el Derecho de la Unión o de los Estados miembros con garantías adecuadas). No se mezclan ambos artículos en este análisis.

El TJUE, en *Meta Platforms y otros* (C-252/21, 4 de julio de 2023), confirmó que la prohibición del art. 9.1 es independiente de si la información revelada es correcta o de si el responsable actúa con intención de obtener un dato de categoría especial — datos inferidos pueden caer bajo el art. 9 si la operación de tratamiento "revela" información de esas categorías.

**[INTERPRETACIÓN]**

- **Fecha/hora/lugar de nacimiento:** no encajan en ninguna de las categorías cerradas del art. 9.1 — no revelan origen étnico, salud, religión, orientación sexual ni afiliación sindical por sí mismos. No son, con los hechos actuales, datos del art. 10 tampoco (no hay ningún dato de condenas o infracciones penales en este tratamiento).
- **Texto libre:** riesgo distinto y no nulo de que el usuario incluya accidentalmente, dentro de su relato, información que revele datos de categoría especial del art. 9 sobre la segunda persona (p. ej. orientación sexual, salud, religión). Conforme al criterio *Meta Platforms*, eso podría activar el art. 9 con independencia de la intención. No se ha identificado ningún riesgo equivalente respecto al art. 10 (no hay contexto de condenas/infracciones penales en el producto).
- **Datos inferidos/derivados astrológicos:** datos técnicos sobre posiciones planetarias relativas; no encajan en ninguna categoría del art. 9 ni del art. 10 por su contenido.
- **Conclusión:** el núcleo estructurado no plantea, con los hechos conocidos, un problema de art. 9 ni de art. 10. El campo de texto libre sigue siendo el único vector de riesgo identificado, exclusivamente respecto al art. 9.

---

## 7. Perfilado y Artículo 22

**[NORMA/CRITERIO OFICIAL]**

- Art. 4(4) RGPD: definición de "elaboración de perfiles" — tratamiento automatizado para evaluar o predecir aspectos personales (rendimiento, situación económica, salud, preferencias, comportamiento, ubicación, etc.).
- Art. 22.1 RGPD: derecho a no ser objeto de una decisión basada únicamente en tratamiento automatizado, incluida la elaboración de perfiles, que produzca efectos jurídicos o afecte significativamente de modo similar.
- WP251 (Grupo de Trabajo del art. 29, refrendado por el EDPB): el perfilado no activa por sí solo el art. 22 — se requiere además una "decisión" basada únicamente en ese tratamiento (sin intervención humana real) con efectos jurídicos o significativamente similares.

**[INTERPRETACIÓN]**

- Probable que exista perfilado en sentido del art. 4(4), tanto respecto al usuario como, de forma indirecta, respecto a la segunda persona.
- No está claro que exista una "decisión" con efectos jurídicos o significativamente similares: la salida es una lectura interpretativa de compatibilidad, sin determinar acceso a ningún servicio, crédito, empleo o consecuencia jurídica obligatoria.
- Con los hechos actuales, el art. 22 no parece aplicable, pero no se afirma ni se descarta de forma definitiva.
- **Este análisis de perfilado/art. 22 es un análisis adicional e independiente**, que no forma parte de las 6 preguntas originales de `VEGA_Segmento_B_Revision_Juridica_v1.md` — esas 6 preguntas no mencionan el art. 22 en ningún momento, y este LIA no sugiere lo contrario. Si se quiere someter esta cuestión a la revisión jurídica externa, debe plantearse como una pregunta adicional explícita, separada de las 6 ya aprobadas.

---

## 8. Salvaguardas

**[HECHO] Salvaguardas actuales:** ausencia de nombre/email/teléfono de la segunda persona; minimización a 4 campos; borrado inmediato + fallback de 1h (reducido desde 24h el 2026-10-07); derivado limitado a 24h (reducido desde 30 días el 2026-10-07); separación entre proveedores; no envío de datos de nacimiento a PostHog; canal de borrado existente; tráfico real suspendido; **declaración del usuario sobre datos de terceros, implementada el 2026-10-07** (`components/experiment/flow/PartnerStep.tsx`, checkbox obligatorio antes de continuar): *"Declaro que dispongo de estos datos de forma legítima según mi conocimiento y que entiendo que no debo introducir información de terceros sin una justificación adecuada."* + *"Esta declaración no constituye la base jurídica del tratamiento por Vega ni sustituye las obligaciones de información del art. 14."* Es una medida de reducción de riesgo frente al usuario, no una pieza que resuelva la base jurídica o la obligación de información hacia la segunda persona.

**[INTERPRETACIÓN] Salvaguardas adicionales propuestas, no implementadas:**

- Aviso contextual antes de introducir datos de un tercero, explicando brevemente qué se hace con ellos y durante cuánto tiempo.
- Aviso o restricción en el campo de texto libre para reducir el riesgo del art. 9 identificado en el bloque 6.
- Reevaluar si el plazo del derivado podría reducirse sin perjudicar la medición del experimento — **ya implementado**: reducido de 30 días a 24 horas el 2026-10-07 (ver `VEGA_Base_Juridica_Segmento_B_v1.md`).
- Evaluar si la precisión exacta de las coordenadas es estrictamente necesaria para el cálculo — **evaluado y decidido el 2026-10-08**: prueba técnica en 3 ciudades (Madrid, Reykjavik, Buenos Aires) con datos sintéticos contra Railway, en modo full y partial (ver `VEGA_Base_Juridica_Segmento_B_v1.md`, bloque 5.B). Decisión: redondear latitud/longitud a 2 decimales, misma regla en full y partial; `timezoneId` se mantiene sin cambios por resultar obligatorio, verificado empíricamente, en ambos modos. **Implementado en código el 2026-10-08** (`libs/experiment/onboarding-service.ts`, función `submitPartner`, helper `roundPartnerCoordinate`), cubierto por tests (`tests/unit/onboarding-service.test.ts`) y **desplegado y verificado en producción**: ejecución real del Segmento B con `?test=1`, Railway devolvió `status: "ok"` y generó `allowed_evidence`/la lectura correctamente con las coordenadas ya redondeadas, sin errores ni degradación funcional.

De estas propuestas, la precisión geográfica ya fue evaluada, decidida, implementada en código y verificada en producción el 2026-10-08 (ver `VEGA_Base_Juridica_Segmento_B_v1.md`); las dos restantes (aviso contextual sobre terceros; aviso/restricción del texto libre) siguen sin evaluar ni implementar.

---

## 9. Resultado del LIA

**Resultado provisional: potencialmente defendible bajo interés legítimo, pero no puede considerarse cerrado mientras no se resuelva el cumplimiento del art. 14 y la ponderación relativa a las expectativas razonables de la segunda persona.**

Razonamiento:

- El test de finalidad se supera si el interés se formula de forma estrecha (bloque 2).
- El test de necesidad se supera para el núcleo estructurado; es más débil para el texto libre (bloque 3).
- El test de ponderación no es unívocamente favorable: los factores técnicos (minimización, retención, pseudonimización) son sólidos, pero el factor de expectativas razonables / ausencia de relación / imposibilidad práctica de conocimiento de la segunda persona sigue sin resolverse y pesa en contra (bloque 4).
- El art. 14 no está hoy satisfecho, y la posible excepción del art. 14.5.b no puede darse por aplicable — su umbral es alto y de interpretación restrictiva según el criterio oficial del EDPB; la ausencia de datos de contacto es un elemento del diseño de minimización, no una demostración de que la excepción se cumpla (bloque 5).
- Por ello, no se cierra el balancing test como "favorable" ni se presenta esta conclusión como definitiva. Persisten piezas abiertas (art. 14, identidad del responsable, expectativas razonables de la segunda persona) que deben resolverse, en paralelo o con carácter previo, para poder sostener el interés legítimo como base jurídica consolidada antes de tráfico real.

**Nivel de confianza: moderado.** Basado en fuentes oficiales vigentes, con la cautela expresa de que las EDPB Guidelines 1/2024 sobre el art. 6.1.f permanecen, a la fecha de esta revisión, en versión 1.0 sometida a consulta pública (consulta cerrada el 20-11-2024), sin que se haya localizado una versión final adoptada en la web oficial del EDPB — se citan como tales, no como directrices definitivas.

---

## 10. Matriz final

| Cuestión | Fuente oficial | Conclusión | Nivel de confianza | Acción recomendada |
|---|---|---|---|---|
| Finalidad legítima (art. 6.1.f) | Art. 6.1.f RGPD; EDPB Guidelines 1/2024 (consulta pública, 8-10-2024) | Legítima si se formula de forma estrecha | Moderado-alto | Documentar el interés en términos estrechos |
| Necesidad — datos estructurados | EDPB Guidelines 1/2024 | Superada | Alto | Ninguna acción adicional |
| Necesidad — texto libre | EDPB Guidelines 1/2024 | Más débil | Moderado | Evaluar restricción/aviso (bloque 8) |
| Ponderación — minimización/retención/pseudonimización | Recital 47 RGPD; EDPB Guidelines 1/2024 | Favorable al responsable | Alto | Mantener como está |
| Ponderación — expectativas razonables de la segunda persona | Recital 47 RGPD | Débil — sin relación, sin conocimiento posible | Moderado-alto | Pendiente de asesoría — no vinculado a ninguna de las 6 preguntas originales del segmento B; plantear como cuestión adicional dentro del apartado C del paquete externo |
| Art. 9 — datos estructurados de nacimiento | Art. 9.1 RGPD (lista cerrada) | No constituyen categoría especial | Alto | Ninguna acción |
| Art. 9 — texto libre | CJEU C-252/21 (*Meta Platforms*) | Riesgo real pero de baja probabilidad por caso | Moderado | Considerar salvaguarda (bloque 8); incluir en consulta a asesoría |
| Art. 10 — condenas/infracciones penales | Art. 10 RGPD | No aplica — sin hechos que lo activen | Alto | Ninguna acción |
| Art. 14 — aplicabilidad | Art. 14.1-14.4 RGPD | Aplica; no satisfecho hoy | Alto | Pendiente de asesoría (pregunta 3 de las seis preguntas originales del segmento B, apartado B. Segmento B del paquete externo) |
| Art. 14.5.b — excepción | Art. 14.5.b RGPD; criterio EDPB de interpretación restrictiva/umbral alto | No se concluye que aplica; la ausencia de datos de contacto no la demuestra por sí misma | Bajo | Pendiente de asesoría; no implementar como si ya aplicara |
| Perfilado (art. 4.4) | Art. 4(4) RGPD | Probable que exista perfilado | Moderado-alto | Ninguna acción específica |
| Art. 22 — aplicabilidad | Art. 22.1 RGPD; WP251 | No parece aplicable con los hechos actuales; no se afirma ni descarta de forma definitiva | Moderado | Cuestión adicional e independiente de las 6 preguntas del segmento B — plantear por separado si se quiere someter a asesoría |
| Resultado global del LIA | Síntesis de lo anterior | Potencialmente defendible bajo interés legítimo; no cerrado | Moderado | Resolver art. 14, identidad del responsable y expectativas razonables antes de tráfico real; aplicar al menos una salvaguarda del bloque 8 |

---

**Nota final:** este LIA no sustituye el análisis del art. 14 (bloque 5) ni las 6 preguntas abiertas de `VEGA_Segmento_B_Revision_Juridica_v1.md`, que siguen siendo responsabilidad de la revisión jurídica externa.
