# VEGA — Base jurídica del art. 6 RGPD para los datos de la segunda persona (Segmento B) v1

**Naturaleza:** Análisis preparatorio, no vinculante, basado en fuentes oficiales (RGPD/EUR-Lex, EDPB, AEPD) y en una auditoría técnica read-only del código, migraciones y documentación de Vega. Distingue **[HECHO]** / **[NORMA/CRITERIO OFICIAL]** (con cita) / **[INTERPRETACIÓN]** (no vinculante). Parte de la premisa ya adoptada en `VEGA_Datos_Personales_Tercero_Segmento_B_v1.md`: a efectos de diseño de cumplimiento, los datos de la segunda persona se tratan como datos personales. Responde a la pregunta 2 original de `VEGA_Segmento_B_Revision_Juridica_v1.md`.

---

## 1. Hechos relevantes para la base jurídica

**[HECHO]**

- El usuario solicita voluntariamente una sinastría/análisis relacional.
- Introduce datos de nacimiento de una segunda persona.
- La segunda persona no interactúa con Vega en ningún momento.
- Vega no obtiene su consentimiento.
- Vega no tiene relación contractual con esa segunda persona.
- No se solicita nombre, email, teléfono ni identificador directo de ella.
- Dato bruto: borrado inmediato tras el cálculo, máximo técnico de 24 h como fallback (verificado en código; ver bloque 4).
- Derivado: máximo 30 días (verificado en código; ver bloque 4).
- Finalidad concreta: producir el análisis de sinastría solicitado por el usuario.
- No se usa la información de la segunda persona para publicidad, perfil comercial propio de ella, venta de datos, ni decisiones con efectos jurídicos sobre ella.
- El tráfico real sigue suspendido.

---

## 2. Análisis base por base del art. 6.1 RGPD

**[NORMA/CRITERIO OFICIAL]** Art. 6.1 RGPD: el tratamiento es lícito solo si concurre, al menos, una de las seis bases: (a) consentimiento; (b) ejecución de un contrato en el que el interesado es parte, o medidas precontractuales a petición del interesado; (c) cumplimiento de una obligación legal; (d) protección de intereses vitales; (e) cumplimiento de una misión de interés público o ejercicio de poderes públicos; (f) interés legítimo.

**[INTERPRETACIÓN]**

| Base | ¿Aplica jurídicamente? | Por qué | ¿Se refiere al usuario o a la segunda persona? | Confianza |
|---|---|---|---|---|
| **6.1.a Consentimiento** | No, con el diseño actual | Vega nunca obtiene el consentimiento de la segunda persona; no existe ningún mecanismo de recogida, verificación ni registro de su voluntad. Sería jurídicamente posible con una arquitectura distinta en la que la segunda persona prestase consentimiento válido directamente — simplemente no está disponible en el diseño actual | Segunda persona (inexistente hoy) | Alta (en el sentido de que la ausencia, con el diseño actual, es clara) |
| **6.1.b Ejecución de contrato** | No, respecto a la segunda persona; sí, respecto al usuario | El contrato/servicio es entre Vega y el usuario; la segunda persona no es parte de él (ver bloque 4 del documento original de este análisis) | Usuario (válida para sus propios datos); no para los de la segunda persona | Alta |
| **6.1.c Obligación legal** | No | No existe ninguna norma que obligue a Vega a tratar estos datos | — | Alta |
| **6.1.d Intereses vitales** | No | No hay ningún escenario de riesgo vital en juego | — | Alta |
| **6.1.e Interés público** | No | Vega es un producto comercial privado; no ejerce ninguna misión de interés público ni poder público | — | Alta |
| **6.1.f Interés legítimo** | Única base jurídica disponible con el diseño actual | Es la única base que, en abstracto, podría ajustarse a un tratamiento sin consentimiento directo del interesado y sin relación contractual con él | Segunda persona (y, en su formulación, también el interés del usuario y de Vega) | Moderada (ver bloques 5-9) |

---

## 3. Consentimiento de la segunda persona — art. 6.1.a

**[NORMA/CRITERIO OFICIAL]** **Art. 4.11 RGPD:** consentimiento es "toda manifestación de voluntad libre, específica, informada e inequívoca por la que el interesado acepta, ya sea mediante una declaración o una clara acción afirmativa, el tratamiento de datos personales que le conciernen." **Art. 7 RGPD:** la carga de la prueba de la existencia del consentimiento corresponde al responsable (art. 7.1); debe poder retirarse tan fácilmente como se otorgó (art. 7.3); debe prestarse especial atención a si es realmente libre (art. 7.4, Recital 43).

**[INTERPRETACIÓN]**

- **¿Podría usarse 6.1.a?** En teoría sí, como base jurídica distinta, con una arquitectura diferente de la actual que permitiera a la propia segunda persona manifestar su voluntad directamente a Vega. Esto no existe en el diseño actual.
- **¿El consentimiento del usuario que introduce los datos sirve como consentimiento de la segunda persona?** No — el art. 4.11 exige la manifestación de voluntad del propio interesado, no de un tercero que actúa en su nombre sin poder de representación verificado.
- **¿Una declaración del usuario diciendo que dispone legítimamente de esos datos equivale a consentimiento del tercero?** No — no satisface ninguno de los cuatro requisitos cumulativos del art. 4.11 respecto a la segunda persona.
- **¿Sería necesario obtener consentimiento directamente de la segunda persona para usar 6.1.a?** Sí, con un mecanismo que hoy no existe.

**Conclusión: 6.1.a no aplicable con el diseño actual** — jurídicamente posible en abstracto con otra arquitectura, no disponible hoy.

---

## 4. Ejecución de contrato — art. 6.1.b

**[NORMA/CRITERIO OFICIAL]** **EDPB, Directrices 2/2019 sobre el art. 6.1.b RGPD en el contexto de servicios en línea:** el responsable debe poder demostrar que el objeto principal del contrato concreto con el interesado no puede, de hecho, cumplirse si no se produce el tratamiento de datos en cuestión; el tratamiento "útil pero no objetivamente necesario" no encaja en el art. 6.1.b; si existen alternativas razonables y menos intrusivas, el tratamiento no se considera necesario a estos efectos. Sobre terceros no parte del contrato: "el responsable no puede transferir o tratar datos de un tercero sin interés legítimo o consentimiento para ese fin específico, porque el contrato es con el responsable y no con el tercero."

**[INTERPRETACIÓN]**

- El contrato/servicio de Vega (segmento B) es entre Vega y el usuario — la segunda persona no es parte de él.
- **Necesidad contractual para tratar datos del propio usuario:** válida — el art. 6.1.b cubre sin dificultad los datos del propio usuario.
- **Necesidad funcional del producto:** que la sinastría necesite datos de una segunda persona para funcionar es un hecho técnico/de producto, no una base jurídica.
- **Base jurídica para los datos de un tercero:** conforme a las Directrices 2/2019, el art. 6.1.b no puede justificar el tratamiento de los datos de la segunda persona.

**Conclusión: 6.1.b no aplicable respecto a los datos de la segunda persona** (sí aplicable, sin relación con esta pregunta, respecto a los propios datos del usuario).

---

## 5. Interés legítimo — art. 6.1.f (bloque principal)

### A. Interés legítimo

**[NORMA/CRITERIO OFICIAL]** EDPB Guidelines 1/2024 (versión 1.0 publicada el 8 de octubre de 2024; consulta pública cerrada el 20 de noviembre de 2024; sin asumir que exista una versión final posterior): el interés debe ser lícito, suficientemente concreto y real.

**[INTERPRETACIÓN]**

- Formulación estrecha evaluada: **"permitir al usuario obtener, a petición propia, un análisis relacional/sinastría utilizando los datos mínimos necesarios de una segunda persona."**
- **Conclusión: la finalidad legítima está suficientemente establecida** — es lícita, concreta (funcionalidad específica y delimitada) y real (demanda activa del usuario en el momento del tratamiento).

### B. Necesidad — corregida tras la auditoría técnica

**[NORMA/CRITERIO OFICIAL]** EDPB Guidelines 1/2024: debe comprobarse si el interés perseguido puede alcanzarse razonablemente, de forma igual de eficaz, mediante medios menos intrusivos.

**[INTERPRETACIÓN] — separando necesidad jurídica de dependencia técnica actual, campo por campo**

- **Fecha de nacimiento:** necesaria sin alternativa — hecho verificado en código (`derivePartnerPrecision`: sin `birthDate`, rechazo en origen, `"not_viable"`).
- **Hora de nacimiento:** **no es necesaria para la modalidad básica/partial; solo es necesaria para las funcionalidades que requieren precisión temporal completa** (cálculo de ángulos). El diseño ya materializa esta distinción (`partnerPrecision = "partial"`, exclusión activa de campos sensibles a precisión por el propio esquema de validación de Vega). Mantener la hora opcional y el modo `partial` no es una concesión nueva — confirma que este punto del test de necesidad ya está correctamente resuelto.
- **Lugar/coordenadas:**
  - **Dependencia técnica actual (hecho de código):** el código actual no genera ningún resultado de sinastría sin `placeId` — Railway siempre devuelve `insufficient_data` cuando la precisión de cualquiera de los dos participantes es `"minimal"`.
  - **Necesidad jurídica (distinta de la dependencia técnica):** que el producto, tal como está construido hoy, dependa de este dato no demuestra por sí solo que no exista una alternativa razonablemente igual de eficaz y menos intrusiva (p. ej. una granularidad geográfica menor que la de ciudad).
  - **Formulación correcta: necesarios para la implementación actual; necesidad jurídica probablemente satisfecha, pero pendiente de una prueba razonable de alternativa geográfica menos intrusiva.** No se declara cerrado este punto del test de necesidad antes de esa comprobación, pero tampoco se convierte en un bloqueante del proyecto mientras se realiza.
  - Hecho adicional verificado: las coordenadas almacenadas son centroides de un dataset estático de ciudades, no coordenadas GPS individuales — la minimización geográfica ya está aplicada a un nivel razonable.
- **Zona horaria (`timezoneId`):** se envía siempre junto a las coordenadas, incluso sin hora conocida (hecho verificado en código). Queda pendiente comprobar si Railway podría derivarla internamente de las coordenadas sin necesidad de enviarla como dato independiente — mejora técnica futura, no bloqueante salvo que una fuente jurídica oficial la exija expresamente (no se ha identificado ninguna que lo haga).

### Procesamiento vs. retención del dato en bruto — separados, con las decisiones de diseño propuestas

- **Procesamiento:** necesario, se agota en el instante del cálculo — sin cuestionamiento.
- **Conservación ordinaria del bruto tras el cálculo:** innecesaria — ya resuelto mediante borrado inmediato tras la derivación.
- **Fallback técnico (implementado el 2026-10-07, `supabase/migrations/20260109000000_segment_b_retention_reduction.sql`):** `expires_at` reducido de +24h a **+1 hora**. El cron de purga (`purge-partner-input-expired`) se mantiene con su cadencia horaria actual, sin cambios; documentado con precisión que, por esa cadencia, **el tiempo real máximo hasta la eliminación de una fila cuyo borrado inmediato haya fallado puede aproximarse a 2 horas** (1h de `expires_at` + hasta 1h adicional hasta la siguiente ejecución del cron), no "1 hora" sin más.
- **Hecho verificado en la auditoría técnica:** el máximo actual de 24h no deriva de la cadencia del cron (horaria) ni de ninguna necesidad técnica del cálculo — es una cifra de diseño provisional, documentada como tal en la propia migración de origen, anterior incluso a la existencia del cálculo real de sinastría.

### Retención del derivado — separada y reformulada

- **Antes (30 días):** servía a una finalidad distinta de la estrecha formulada en el apartado A, sin justificación de necesidad propia desarrollada.
- **Implementado el 2026-10-07** (`supabase/migrations/20260109000000_segment_b_retention_reduction.sql` + corrección de la revisión de seguridad del mismo día): reducido a **24 horas de vigencia**, reformulado explícitamente como **"retención de 24h exclusivamente para continuidad/reintentos de corto plazo"** — no como una ventana general de revisión posterior dentro de un mes. Tras esas 24h, el dato deja de poder reutilizarse para ese fin, con independencia de si ya se ha eliminado físicamente — comprobación aplicada en el propio código de lectura (`getPartnerDerivedProfileByFlowAttempt`), no solo en el plazo de purga, precisamente porque la revisión de seguridad detectó que, sin esa comprobación, la purga diaria original podía dejar la ventana real efectiva en hasta ~48h. La eliminación física corre ahora a cargo de una función y un cron dedicados y horarios (`purge_expired_partner_derived_profile()`), separados de la purga diaria del resto del núcleo — el margen operativo real entre caducidad lógica y física queda así en ~1h, no en ~24h.
- **Conclusión:** con esa reformulación, ya implementada y corregida, esta retención supera razonablemente el test de necesidad.

**Conclusión global de este bloque: la necesidad está muy reforzada tras la reducción de retenciones propuesta, pero con una comprobación residual pendiente sobre minimización geográfica (lugar/coordenadas) y sobre `timezoneId` — no cerrada al 100%, aunque probablemente satisfecha.**

### C. Ponderación

**[NORMA/CRITERIO OFICIAL]** EDPB Guidelines 1/2024: factores relevantes — naturaleza de los datos, expectativas razonables del interesado, relación con el responsable, impacto de la operación, salvaguardas. Recital 47 RGPD: el interesado debería poder esperar, en el momento y contexto de la recogida, que sus datos puedan tratarse con ese fin.

**[INTERPRETACIÓN] — sin concluir automáticamente a favor de Vega, sin elevarse por las mejoras de necesidad/retención**

Factores favorables: minimización del núcleo de datos; ausencia de identificadores directos en todos los proveedores; impacto potencial bajo (no hay decisiones ni perfiles comerciales propios sobre la segunda persona); existencia, en diseño, de un canal de oposición (gated por identificación, conforme a `VEGA_Analisis_Art14_Segmento_B_v1.md`); y, una vez implementadas, las reducciones de retención propuestas (bruto a ~2h reales, derivado a 24h con finalidad estrecha).

**Factor que sigue siendo el más débil, sin mitigarse por lo anterior: las expectativas razonables de la segunda persona.** La segunda persona no tiene relación con Vega, no conoce el tratamiento, y no tiene ninguna vía estructural de enterarse de él antes de que ocurra (bloque 6 del análisis previo, con la hipótesis prudente ya adoptada: mientras no se conozca el origen real de los datos, se asume el escenario de comunicación privada entre personas, que impone el estándar de protección más exigente). Este factor opera sobre un eje distinto al de la proporcionalidad temporal de la retención — reducir cuánto tiempo se conservan los datos no cambia si la segunda persona espera, razonablemente, este tratamiento.

**Sobre el papel de una eventual consulta externa:** una consulta jurídica externa podría ayudar a valorar jurídicamente cómo pesa este factor en el balance global, pero **no modifica los hechos ni las expectativas reales de la segunda persona** — no se presenta como una salvaguarda ni como una vía para inclinar el resultado de la ponderación.

**Conclusión de este bloque: la ponderación sigue siendo el punto jurídico más débil del conjunto, por expectativas razonables — no mitigado por las mejoras de necesidad y retención.**

---

## 6. Expectativas razonables (remisión)

**[INTERPRETACIÓN]** Se mantiene el análisis por escenarios ya desarrollado (datos comunicados privadamente por pareja/familiar/amigo; datos publicados voluntariamente por la segunda persona; datos de fuente públicamente accesible; otro origen legítimo), sin presumir cuál es el real en cada caso concreto. Mientras Vega no conozca la procedencia, se adopta como hipótesis prudente de trabajo el escenario de comunicación privada, que impone el estándar de protección más exigente. No se propone preguntar al usuario por el origen de forma automática, por el coste de fricción y de datos adicionales que ello implicaría, y por el valor probatorio limitado de una autodeclaración no verificable.

---

## 7. Declaración del usuario

**[INTERPRETACIÓN]** Se mantiene la declaración ya evaluada: *"El usuario declara que dispone de esos datos de forma legítima según su conocimiento y que entiende que no debe introducir información de terceros sin una justificación adecuada."* + *"Esta declaración no constituye la base jurídica del tratamiento por Vega ni sustituye las obligaciones de información del art. 14."* Su valor es de mitigación de riesgo y evidencia de buena fe — no es base jurídica, no sustituye el art. 14, y no mejora por sí sola el factor de expectativas razonables de la segunda persona, que es independiente de lo que el usuario declare internamente a Vega.

---

## 8. Art. 9 — comprobación lateral

**[INTERPRETACIÓN]** Fecha, hora y lugar de nacimiento no son, por sí mismos, categorías especiales del art. 9.1. El riesgo de que el texto libre del usuario incluya accidentalmente datos de categoría especial sobre la segunda persona sigue siendo el único vector de riesgo identificado — no es el centro de este análisis de base jurídica.

---

## 9. Alternativas de diseño

**[INTERPRETACIÓN]** Se mantienen como mejoras evaluadas: hora opcional (ya implementada); reducir precisión geográfica (pendiente de la prueba técnica del bloque 5.B); eliminar/reducir texto libre sobre la segunda persona (no implementado); advertencia expresa sobre categorías especiales (no implementado); reducir retención del derivado (implementada a 24h el 2026-10-07); declaración del usuario (ya evaluada, bloque 7); aviso contextual sobre terceros (no implementado).

---

## 10. Resultado

| Base | Conclusión |
|---|---|
| 6.1.a Consentimiento | No aplicable con el diseño actual (jurídicamente posible con otra arquitectura) |
| 6.1.b Ejecución de contrato | No aplicable (respecto a los datos de la segunda persona) |
| 6.1.c Obligación legal | No aplicable |
| 6.1.d Intereses vitales | No aplicable |
| 6.1.e Interés público | No aplicable |
| 6.1.f Interés legítimo | **Defendible con condiciones** |

**Conclusión global: Art. 6.1.f — defendible con condiciones.** Es la única base jurídica disponible con el diseño actual de Vega — no porque las demás sean imposibles en abstracto (el consentimiento del art. 6.1.a sería jurídicamente posible con una arquitectura distinta en la que la segunda persona prestase consentimiento válido), sino porque, dado el diseño actual, ninguna de las demás está disponible.

**Tres elementos distinguidos, no uno solo:**
- **Finalidad legítima:** suficientemente establecida.
- **Necesidad:** muy reforzada tras la reducción de retenciones propuesta, pero con una comprobación residual pendiente sobre minimización geográfica/`timezoneId`.
- **Ponderación:** sigue siendo el punto jurídico más débil, por expectativas razonables.

**Las tres condiciones para considerar cerrada esta base jurídica:**

1. Completar una prueba razonable de alternativas menos intrusivas para lugar/coordenadas/`timezoneId` (comprobación técnica acotada, no bloqueante del proyecto mientras se realiza) — **pendiente**.
2. Reforzar y documentar la ponderación de expectativas razonables y las salvaguardas correspondientes — **pendiente**.
3. Implementar efectivamente las reducciones de retención propuestas (fallback de 1h del bruto, con ventana real de hasta ~2h por la cadencia del cron; 24h del derivado) antes de abrir tráfico real — **implementado el 2026-10-07** (`supabase/migrations/20260109000000_segment_b_retention_reduction.sql`; aún no aplicado a producción, pendiente de aprobación explícita antes de ejecutarlo en Supabase).

La conclusión global de "defendible con condiciones" se mantiene sin cambios: la condición 3 queda satisfecha en el código/migración, pero las condiciones 1 y 2 siguen abiertas, y la migración todavía no se ha aplicado al entorno real de Supabase.

**Sobre el art. 14:** el art. 14 RGPD constituye una obligación de transparencia independiente que deberá resolverse antes de tráfico real (analizado internamente en `VEGA_Analisis_Art14_Segmento_B_v1.md`), pero su cumplimiento no sustituye ni completa por sí mismo los tres pasos del test de interés legítimo — no se cuenta, por tanto, entre las tres condiciones anteriores.

---

## 11. Matriz final

| Cuestión | Fuente oficial | Conclusión | Confianza | Condiciones | Consecuencia práctica |
|---|---|---|---|---|---|
| 6.1.a Consentimiento | Art. 4.11 y 7 RGPD | No aplicable con el diseño actual; posible con otra arquitectura | Alta | Requeriría un mecanismo de recogida directa, no diseñado hoy | No usar como base; no presentar la declaración del usuario como consentimiento |
| 6.1.b Ejecución de contrato | EDPB Directrices 2/2019 | No aplicable a los datos de la segunda persona | Alta | Ninguna — estructuralmente inaplicable | Mantener 6.1.b solo para los datos propios del usuario |
| Finalidad legítima (6.1.f) | EDPB Guidelines 1/2024 (v1.0 publicada; consulta cerrada) | Suficientemente establecida | Alta | Ninguna | Documentar el interés en términos estrechos |
| Necesidad — lugar/coordenadas | EDPB Guidelines 1/2024; hechos de código | Necesarios para la implementación actual; necesidad jurídica probablemente satisfecha, pendiente de prueba razonable de alternativa menos intrusiva | Moderada-alta | Completar prueba de granularidad geográfica menor (no bloqueante) | No declarar cerrado el test de necesidad para este dato hasta esa comprobación |
| Necesidad — zona horaria (`timezoneId`) | Hechos de código | Necesidad independiente no verificada | Baja-moderada | Comprobar si Railway puede derivarla de las coordenadas (no bloqueante) | Mantener como mejora técnica pendiente |
| Necesidad — retención del bruto (fallback) | Implementado 2026-10-07 (`20260109000000_segment_b_retention_reduction.sql`) | Reforzada: ~2h reales (1h nominal + margen del cron horario) | Alta | Migración creada, pendiente de aplicar a producción | Mejora el test de necesidad; efectiva una vez aplicada en Supabase |
| Necesidad — retención del derivado | Implementado 2026-10-07 (`20260109000000_segment_b_retention_reduction.sql` + corrección de lectura `delete_after`/purga horaria dedicada) | Reforzada: 24h de vigencia (no reutilizable después, con independencia del borrado físico) + ~1h de margen físico, con finalidad estrecha de continuidad/reintentos | Alta | Migración y código listos, pendientes de aplicar a producción (incluye configurar manualmente el nuevo cron horario en Supabase) | Igual que la fila anterior |
| Ponderación — expectativas razonables de la segunda persona | Recital 47 RGPD; hipótesis prudente adoptada | Sigue siendo el punto jurídico más débil; no mitigado por las mejoras de necesidad/retención | Moderado-alto | Reforzar y documentar salvaguardas específicas; una consulta externa no resuelve este factor por sí misma | Una de las tres condiciones pendientes, no la única |
| Art. 14 | Art. 14 RGPD | Obligación de transparencia independiente, no integrada en el test de interés legítimo | Alta | Resolver antes de tráfico real, en paralelo (analizado internamente en `VEGA_Analisis_Art14_Segmento_B_v1.md`) | No se cuenta como condición del art. 6.1.f |
| Resultado global — art. 6.1.f | Síntesis de lo anterior | Defendible con condiciones | Moderada | (1) Prueba de alternativa geográfica menos intrusiva — pendiente; (2) refuerzo documentado de la ponderación de expectativas razonables — pendiente; (3) implementación efectiva de las reducciones de retención — código/migración listos, aplicación a producción pendiente de aprobación | Única base jurídica disponible con el diseño actual; dos condiciones abiertas, una satisfecha en código pero no todavía en producción |

---

## 12. Impacto en documentos existentes

**[INTERPRETACIÓN]**

- **`VEGA_LIA_Segmento_B_v1.md`:** debería revisarse para incorporar la distinción entre dependencia técnica actual y necesidad jurídica (bloque 5.B), y las reducciones de retención propuestas (bruto ~2h, derivado 24h), una vez implementadas.
- **`VEGA_Analisis_Art14_Segmento_B_v1.md`:** no requiere cambios de fondo — su tratamiento del art. 14 como obligación independiente es coherente con la corrección aplicada en este documento (bloque 10).
- **Política de privacidad:** cuando se redacte la sección específica del segmento B, debe declararse el interés legítimo como base jurídica en los términos estrechos del bloque 5.A, con las retenciones reales (una vez implementadas las reducciones propuestas), no las de 24h/30 días originales.
- **Interfaz del segmento B:** no se modifica en este documento; las decisiones de diseño (reducción de retenciones) siguen pendientes de implementación.

No se ha modificado ningún archivo. Este es el análisis completo, en su versión final aprobada.
