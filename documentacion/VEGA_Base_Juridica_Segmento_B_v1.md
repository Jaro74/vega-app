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
- Dato bruto (`partner_input`): borrado inmediato en el flujo normal tras el cálculo; fallback lógico de 1 hora (`expires_at`); purga horaria (`purge-partner-input-expired`); margen físico excepcional de hasta ~2 horas si el borrado inmediato falla (implementado y aplicado en Supabase el 2026-10-07; ver bloque 4 y bloque 5.B).
- Derivado (`partner_derived_profile`): `delete_after = created_at + 24 horas`; no reutilizable por la aplicación tras `delete_after`, con independencia del borrado físico; purga horaria dedicada (`purge-partner-derived-profile-expired`); posible permanencia física de hasta ~1 hora adicional (implementado y aplicado en Supabase el 2026-10-07; ver bloque 4 y bloque 5.B).
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
  - **[HECHO] Prueba técnica realizada el 2026-10-08** (read-only, llamadas directas a `POST /evidence/synastry` con datos sintéticos, sin tocar Supabase ni OpenAI): matriz controlada en 3 ciudades de latitud muy distinta (Madrid ~40°N, Reykjavik ~64°N, Buenos Aires ~35°S), comparando el `allowed_evidence` devuelto al redondear latitud/longitud a 2, 1 y 0 decimales en modo full y en modo partial, frente al baseline con coordenadas exactas del dataset.
  - **Resultado en modo partial** (hora de la segunda persona desconocida): el redondeo, en cualquiera de los tres niveles probados y en las tres ciudades, no produjo ningún cambio — ni en el número de aspectos ni en ningún valor de `orbe`/`fuerza`/`exacto`. La precisión geográfica es irrelevante en este modo, coherente con que `asc`/`mc` nunca se calculan sin hora conocida.
  - **Resultado en modo full:** a **2 decimales** (~1,1 km) el cambio fue siempre numéricamente insignificante en las tres ciudades, incluida Reykjavik (Δorbe máximo 0.049°, muy por debajo de cualquier `orbe_max` de 5-10°), sin ningún aspecto añadido/perdido ni ningún flip de `exacto`/`toca_angulo`. A **1 decimal**, Reykjavik ya mostró una deriva notablemente mayor (Δorbe 0.326°) que las otras dos ciudades, aunque todavía sin cambios estructurales. A **0 decimales** (~111 km) aparecieron cambios materiales: en Madrid se perdió un aspecto angular completo (`neptune-mc-conjuncion`) y otro aspecto cambió su flag `exacto`; en Reykjavik la deriva llegó a 1.837° de orbe.
  - **Conclusión y decisión (2026-10-08):** 2 decimales es la precisión mínima razonablemente validada para latitud/longitud en modo full — no una garantía matemática universal (la prueba cubre 3 pares de cartas sintéticas concretos, no una muestra exhaustiva), pero sí evidencia empírica directa, incluyendo el caso de mayor sensibilidad observado (alta latitud). **Decisión adoptada: redondear latitud y longitud a 2 decimales, aplicando la misma regla en full y en partial** por simplicidad, consistencia y minimización (en partial la precisión ya era irrelevante, así que aplicar el mismo redondeo no tiene coste jurídico ni técnico adicional) — **implementado en código el 2026-10-08** (`libs/experiment/onboarding-service.ts`, función `submitPartner`, helper `roundPartnerCoordinate`), cubierto por tests (`tests/unit/onboarding-service.test.ts`) y **desplegado en producción (commit `13a6c07`)**.
  - **Verificación en producción (2026-10-08):** ejecución real del Segmento B con `?test=1` tras el despliegue; Railway devolvió `status: "ok"` y generó `allowed_evidence`/la lectura correctamente a partir de las coordenadas ya redondeadas a 2 decimales; no se observaron errores ni degradación funcional. **Condición 1: implementada y verificada en producción.**
  - Hecho adicional ya verificado: las coordenadas almacenadas son centroides de un dataset estático de ciudades, no coordenadas GPS individuales — la minimización geográfica ya estaba aplicada a un nivel razonable antes de esta reducción adicional.
- **Zona horaria (`timezoneId`):** se envía siempre junto a las coordenadas, incluso sin hora conocida (hecho verificado en código). **[HECHO] Verificado empíricamente el 2026-10-08, en modo full y en modo partial:** omitir `timezoneId` manteniendo el resto de datos degrada a la persona a `insufficient_data` en ambos modos por igual — Railway lo exige como parte de lo que considera "lugar suficiente", con independencia de si la hora es conocida. No es derivable de las coordenadas ni omitible; **se mantiene sin cambios**.

### Procesamiento vs. retención del dato en bruto — separados, con las decisiones de diseño propuestas

- **Procesamiento:** necesario, se agota en el instante del cálculo — sin cuestionamiento.
- **Conservación ordinaria del bruto tras el cálculo:** innecesaria — ya resuelto mediante borrado inmediato tras la derivación.
- **Fallback técnico (implementado el 2026-10-07, `supabase/migrations/20260109000000_segment_b_retention_reduction.sql`):** `expires_at` reducido de +24h a **+1 hora**. El cron de purga (`purge-partner-input-expired`) se mantiene con su cadencia horaria actual, sin cambios; documentado con precisión que, por esa cadencia, **el tiempo real máximo hasta la eliminación de una fila cuyo borrado inmediato haya fallado puede aproximarse a 2 horas** (1h de `expires_at` + hasta 1h adicional hasta la siguiente ejecución del cron), no "1 hora" sin más.
- **Hecho verificado en la auditoría técnica:** el máximo actual de 24h no deriva de la cadencia del cron (horaria) ni de ninguna necesidad técnica del cálculo — es una cifra de diseño provisional, documentada como tal en la propia migración de origen, anterior incluso a la existencia del cálculo real de sinastría.

### Retención del derivado — separada y reformulada

- **Antes (30 días):** servía a una finalidad distinta de la estrecha formulada en el apartado A, sin justificación de necesidad propia desarrollada.
- **Implementado el 2026-10-07** (`supabase/migrations/20260109000000_segment_b_retention_reduction.sql` + corrección de la revisión de seguridad del mismo día): reducido a **24 horas de vigencia**, reformulado explícitamente como **"retención de 24h exclusivamente para continuidad/reintentos de corto plazo"** — no como una ventana general de revisión posterior dentro de un mes. Tras esas 24h, el dato deja de poder reutilizarse para ese fin, con independencia de si ya se ha eliminado físicamente — comprobación aplicada en el propio código de lectura (`getPartnerDerivedProfileByFlowAttempt`), no solo en el plazo de purga, precisamente porque la revisión de seguridad detectó que, sin esa comprobación, la purga diaria original podía dejar la ventana real efectiva en hasta ~48h. La eliminación física corre ahora a cargo de una función y un cron dedicados y horarios (`purge_expired_partner_derived_profile()`), separados de la purga diaria del resto del núcleo — el margen operativo real entre caducidad lógica y física queda así en ~1h, no en ~24h.
- **Conclusión:** con esa reformulación, ya implementada y corregida, esta retención supera razonablemente el test de necesidad.

**Conclusión global de este bloque: la necesidad está muy reforzada tras la reducción de retenciones propuesta. La comprobación sobre minimización geográfica (lugar/coordenadas) y `timezoneId` ya se completó el 2026-10-08 (ver prueba técnica arriba): redondeo a 2 decimales para lugar, `timezoneId` sin cambios por ser obligatorio en ambos modos — este punto del test de necesidad queda satisfecho a nivel de análisis, pendiente solo de implementar el redondeo en código.**

### C. Ponderación

**[NORMA/CRITERIO OFICIAL]** EDPB Guidelines 1/2024: factores relevantes — naturaleza de los datos, expectativas razonables del interesado, relación con el responsable, impacto de la operación, salvaguardas. Recital 47 RGPD: el interesado debería poder esperar, en el momento y contexto de la recogida, que sus datos puedan tratarse con ese fin.

**[INTERPRETACIÓN] — cierre documentado el 2026-10-08, sin elevarse artificialmente por las mejoras de necesidad/retención**

Factores favorables: minimización del núcleo de datos; ausencia de identificadores directos en todos los proveedores; impacto potencial bajo (no hay decisiones ni perfiles comerciales propios sobre la segunda persona); existencia, en diseño, de un canal de oposición (gated por identificación, conforme a `VEGA_Analisis_Art14_Segmento_B_v1.md`); y, ya implementadas y verificadas en producción, las reducciones de retención (bruto a ~2h reales, derivado a 24h con finalidad estrecha) y la minimización geográfica (lat/lon a 2 decimales).

**Factor adverso que se mantiene y se pondera dentro de un balance global favorable: las expectativas razonables de la segunda persona.** Para el caso de Vega, esta evaluación se realiza atendiendo al momento y contexto en que Vega obtiene y trata indirectamente esos datos a través del usuario, y a la ausencia de cualquier relación entre la segunda persona y Vega — no se afirma que ese momento coincida necesariamente con el de la comunicación original entre la segunda persona y el usuario, cuyo origen real Vega no verifica (bloque 6). Hecho adverso verificado: la segunda persona no tiene relación alguna con Vega ni motivos claros para esperar que un tercero solicite una sinastría con sus datos. Este factor no desaparece por las mejoras de necesidad/retención — opera sobre un eje distinto — pero, combinado con el impacto bajo, la ausencia de decisiones automatizadas y la finalidad estrecha, el balance global resulta favorable, dejando un **riesgo residual moderado, aceptado y documentado explícitamente** (no eliminado).

**Salvaguardas adicionales evaluadas, clasificadas sin ambigüedad — y distinguidas entre sí:** el **aviso vía el usuario a la segunda persona** (pedir o recomendar al usuario que informe a esa persona de que sus datos se usarán para la sinastría) es una salvaguarda **recomendable, no necesaria** para sostener el art. 6.1.f — mejora el conocimiento efectivo y activaría el canal de oposición ya diseñado, pero no cambia por sí sola la evaluación de expectativa razonable del párrafo anterior. Esto es distinto de un **aviso contextual dentro de Vega al propio usuario** que introduce los datos (explicándole el tratamiento, finalidad, retención u otras cautelas) — ese aviso lo recibe el usuario, no la segunda persona, y no mejora directamente las expectativas razonables de esta (bloque 9). Un **canal público de ejercicio de derechos/oposición** facilita que la segunda persona ejerza sus derechos si llega a conocer o sospechar que sus datos han sido tratados, pero **no resuelve por sí mismo la ausencia inicial de conocimiento**; se clasifica como salvaguarda de **gobernanza y ejercicio de derechos** — no como solución al factor de expectativas razonables, que se mantiene con independencia de dicho canal.

**Sobre el papel de una eventual consulta externa:** una consulta jurídica externa podría ayudar a valorar jurídicamente cómo pesa este factor en el balance global, pero **no modifica los hechos ni las expectativas reales de la segunda persona** — no se presenta como una salvaguarda ni como una vía para inclinar el resultado de la ponderación.

**Conclusión de este bloque (cerrado el 2026-10-08): el factor de expectativas razonables se mantiene como adverso y queda ponderado dentro de un balance global favorable, con riesgo residual moderado aceptado y documentado — no es un veto ni un punto sin resolver.**

---

## 6. Expectativas razonables (remisión)

**[INTERPRETACIÓN]** Se mantiene el análisis por escenarios ya desarrollado (datos comunicados privadamente por pareja/familiar/amigo; datos publicados voluntariamente por la segunda persona; datos de fuente públicamente accesible; otro origen legítimo), sin presumir cuál es el real en cada caso concreto. Mientras Vega no conozca la procedencia, se adopta como hipótesis prudente de trabajo el escenario de comunicación privada, que impone el estándar de protección más exigente. No se propone preguntar al usuario por el origen de forma automática, por el coste de fricción y de datos adicionales que ello implicaría, y por el valor probatorio limitado de una autodeclaración no verificable.

**Precisión (2026-10-08):** esta hipótesis de trabajo es relevante para decidir si preguntar por el origen (fricción, autodeclaración no verificable) y para el nivel de protección aplicado por diseño — **no es lo que fija la evaluación de la expectativa razonable**, que se realiza conforme al bloque 5.C atendiendo al momento y contexto en que Vega obtiene y trata indirectamente los datos a través del usuario, y a la ausencia de relación con la segunda persona, con independencia de cuál sea el escenario de origen real.

---

## 7. Declaración del usuario

**[HECHO] Implementada el 2026-10-07** en `components/experiment/flow/PartnerStep.tsx` (pantalla `form` del Segmento B, checkbox obligatorio tras los campos de fecha/hora/lugar de la otra persona y antes de poder continuar): *"Declaro que dispongo de estos datos de forma legítima según mi conocimiento y que entiendo que no debo introducir información de terceros sin una justificación adecuada."* + *"Esta declaración no constituye la base jurídica del tratamiento por Vega ni sustituye las obligaciones de información del art. 14."* Su valor es de mitigación de riesgo y evidencia de buena fe — no es base jurídica, no sustituye el art. 14, y no mejora por sí sola el factor de expectativas razonables de la segunda persona, que es independiente de lo que el usuario declare internamente a Vega.

---

## 8. Art. 9 — comprobación lateral

**[INTERPRETACIÓN]** Fecha, hora y lugar de nacimiento no son, por sí mismos, categorías especiales del art. 9.1. El riesgo de que el texto libre del usuario incluya accidentalmente datos de categoría especial sobre la segunda persona sigue siendo el único vector de riesgo identificado — no es el centro de este análisis de base jurídica.

---

## 9. Alternativas de diseño

**[INTERPRETACIÓN]** Se mantienen como mejoras evaluadas: hora opcional (ya implementada); reducir precisión geográfica (implementada y verificada en producción el 2026-10-08 tras la prueba técnica del bloque 5.B: redondear lat/lon a 2 decimales, cubierto por tests, desplegado y confirmado con una ejecución real del Segmento B); eliminar/reducir texto libre sobre la segunda persona (no implementado); advertencia expresa sobre categorías especiales (no implementado); reducir retención del derivado (implementada a 24h el 2026-10-07); declaración del usuario (implementada el 2026-10-07, bloque 7); aviso contextual dentro de Vega al usuario que introduce los datos de la segunda persona, explicando tratamiento/finalidad/retención (no implementado; no evaluado como salvaguarda del factor de expectativas razonables, al no llegar a la segunda persona); aviso vía el usuario a la segunda persona, es decir, pedir/recomendar al usuario que informe a esa persona de que sus datos se usarán para la sinastría (evaluado el 2026-10-08: recomendable, no necesario para sostener el art. 6.1.f — bloque 5.C; no implementado); canal público de ejercicio de derechos/oposición, que facilita el ejercicio de derechos si la persona llega a conocer o sospechar el tratamiento pero no resuelve la ausencia inicial de conocimiento (evaluado el 2026-10-08: salvaguarda de gobernanza recomendable, no implementado, no condiciona el cierre de la condición 2 — bloque 5.C).

---

## 10. Resultado

| Base | Conclusión |
|---|---|
| 6.1.a Consentimiento | No aplicable con el diseño actual (jurídicamente posible con otra arquitectura) |
| 6.1.b Ejecución de contrato | No aplicable (respecto a los datos de la segunda persona) |
| 6.1.c Obligación legal | No aplicable |
| 6.1.d Intereses vitales | No aplicable |
| 6.1.e Interés público | No aplicable |
| 6.1.f Interés legítimo | **Defendible, riesgo residual moderado aceptado y documentado** |

**Conclusión global: Art. 6.1.f — defendible, con riesgo residual moderado aceptado y documentado.** Es la única base jurídica disponible con el diseño actual de Vega — no porque las demás sean imposibles en abstracto (el consentimiento del art. 6.1.a sería jurídicamente posible con una arquitectura distinta en la que la segunda persona prestase consentimiento válido), sino porque, dado el diseño actual, ninguna de las demás está disponible.

**Tres elementos distinguidos, no uno solo:**
- **Finalidad legítima:** suficientemente establecida.
- **Necesidad:** muy reforzada tras la reducción de retenciones propuesta, con la comprobación sobre minimización geográfica/`timezoneId` ya completada el 2026-10-08 (decisión adoptada: 2 decimales para lat/lon, `timezoneId` sin cambios; implementado en código, cubierto por tests y verificado en producción).
- **Ponderación:** factor adverso de expectativas razonables mantenido y ponderado dentro de un balance global favorable (bloque 5.C) — riesgo residual moderado, aceptado y documentado.

**Las tres condiciones para considerar cerrada esta base jurídica:**

1. Completar una prueba razonable de alternativas menos intrusivas para lugar/coordenadas/`timezoneId` (comprobación técnica acotada, no bloqueante del proyecto mientras se realiza) — **implementada y verificada en producción el 2026-10-08** (prueba técnica en 3 ciudades contra Railway con datos sintéticos; decisión: redondear lat/lon a 2 decimales en full y partial, `timezoneId` sin cambios por ser obligatorio en ambos modos; implementación en `libs/experiment/onboarding-service.ts` cubierta por tests; desplegada en producción y confirmada con una ejecución real del Segmento B con `?test=1`, sin errores ni degradación funcional).
2. Reforzar y documentar la ponderación de expectativas razonables y las salvaguardas correspondientes — **cerrada el 2026-10-08** (bloque 5.C): factor adverso mantenido y ponderado dentro de un balance global favorable; riesgo residual moderado aceptado y documentado; aviso vía usuario clasificado como recomendable, no necesario; canal público de ejercicio de derechos clasificado como salvaguarda de gobernanza, no como solución al factor de expectativas.
3. Implementar efectivamente las reducciones de retención propuestas (fallback de 1h del bruto, con ventana real de hasta ~2h por la cadencia del cron; 24h del derivado) antes de abrir tráfico real — **implementado y aplicado en producción el 2026-10-07** (`supabase/migrations/20260109000000_segment_b_retention_reduction.sql`, aplicada en Supabase; defaults de `expires_at`/`delete_after` verificados; función dedicada `purge_expired_partner_derived_profile()` verificada; `purge-partner-derived-profile-expired` y `purge-partner-input-expired` activos con cadencia horaria; retención de 24h comprobada con una ejecución real del Segmento B, en la que `partner_input` no conservó ninguna fila residual tras la generación).

La conclusión global pasa a **"defendible, riesgo residual moderado aceptado y documentado"**: las tres condiciones quedan satisfechas (1, 2 y 3). Esto no habilita por sí solo el tráfico real: de forma completamente independiente, siguen pendientes y bloqueantes para abrir tráfico real al menos el art. 14 y la identificación efectiva de la futura sociedad responsable del tratamiento.

**Sobre el art. 14:** el art. 14 RGPD constituye una obligación de transparencia independiente que deberá resolverse antes de tráfico real (analizado internamente en `VEGA_Analisis_Art14_Segmento_B_v1.md`), pero su cumplimiento no sustituye ni completa por sí mismo los tres pasos del test de interés legítimo — no se cuenta, por tanto, entre las tres condiciones anteriores, y sigue siendo, junto con la identificación efectiva de la futura sociedad responsable del tratamiento, un bloqueante separado para el tráfico real.

---

## 11. Matriz final

| Cuestión | Fuente oficial | Conclusión | Confianza | Condiciones | Consecuencia práctica |
|---|---|---|---|---|---|
| 6.1.a Consentimiento | Art. 4.11 y 7 RGPD | No aplicable con el diseño actual; posible con otra arquitectura | Alta | Requeriría un mecanismo de recogida directa, no diseñado hoy | No usar como base; no presentar la declaración del usuario como consentimiento |
| 6.1.b Ejecución de contrato | EDPB Directrices 2/2019 | No aplicable a los datos de la segunda persona | Alta | Ninguna — estructuralmente inaplicable | Mantener 6.1.b solo para los datos propios del usuario |
| Finalidad legítima (6.1.f) | EDPB Guidelines 1/2024 (v1.0 publicada; consulta cerrada) | Suficientemente establecida | Alta | Ninguna | Documentar el interés en términos estrechos |
| Necesidad — lugar/coordenadas | EDPB Guidelines 1/2024; prueba técnica propia 2026-10-08 (3 ciudades, datos sintéticos, contra Railway) | Necesarios para la implementación actual; necesidad jurídica satisfecha — prueba de alternativa menos intrusiva completada, decisión: redondear a 2 decimales | Alta | Redondeo a 2 decimales implementado en código, cubierto por tests y verificado en producción (ejecución real del Segmento B con `?test=1`, sin errores) | Test de necesidad para este dato cerrado a nivel de análisis, código y producción |
| Necesidad — zona horaria (`timezoneId`) | Hechos de código + prueba técnica propia 2026-10-08 | Necesaria y verificada empíricamente: su omisión degrada a `insufficient_data` en full y en partial por igual | Alta | Ninguna — se mantiene sin cambios | Confirmado que no es derivable ni omitible; no hay mejora pendiente |
| Necesidad — retención del bruto (fallback) | Implementado y aplicado en producción 2026-10-07 (`20260109000000_segment_b_retention_reduction.sql`) | Reforzada: ~2h reales (1h nominal + margen del cron horario) | Alta | Migración aplicada en Supabase; default de `expires_at` y cron `purge-partner-input-expired` (horario) verificados | Mejora el test de necesidad; efectiva en producción |
| Necesidad — retención del derivado | Implementado y aplicado en producción 2026-10-07 (`20260109000000_segment_b_retention_reduction.sql` + corrección de lectura `delete_after`/purga horaria dedicada) | Reforzada: 24h de vigencia (no reutilizable después, con independencia del borrado físico) + ~1h de margen físico, con finalidad estrecha de continuidad/reintentos | Alta | Migración aplicada en Supabase; default de `delete_after`, función dedicada y cron `purge-partner-derived-profile-expired` (horario) verificados; retención comprobada con una ejecución real del Segmento B (sin filas residuales de `partner_input` tras la generación) | Igual que la fila anterior |
| Ponderación — expectativas razonables de la segunda persona | Recital 47 RGPD | Factor adverso mantenido y ponderado dentro de un balance global favorable (bloque 5.C); riesgo residual moderado aceptado y documentado | Moderado | Condición 2 cerrada el 2026-10-08; aviso vía usuario = recomendable no necesario; canal público de derechos = salvaguarda de gobernanza, no cura el factor de expectativas | Condición 2 de las tres, cerrada |
| Art. 14 | Art. 14 RGPD | Obligación de transparencia independiente, no integrada en el test de interés legítimo | Alta | Resolver antes de tráfico real, en paralelo (analizado internamente en `VEGA_Analisis_Art14_Segmento_B_v1.md`) | No se cuenta como condición del art. 6.1.f; bloqueante independiente para tráfico real, junto con la identificación efectiva de la futura sociedad responsable del tratamiento |
| Resultado global — art. 6.1.f | Síntesis de lo anterior | Defendible, riesgo residual moderado aceptado y documentado | Moderada | (1) Prueba de alternativa geográfica menos intrusiva — implementada y verificada en producción el 2026-10-08; (2) refuerzo documentado de la ponderación de expectativas razonables — cerrada el 2026-10-08; (3) implementación efectiva de las reducciones de retención — implementada y aplicada en producción | Única base jurídica disponible con el diseño actual; las tres condiciones satisfechas (1, 2 y 3); tráfico real sigue bloqueado de forma independiente por el art. 14 y por la identificación efectiva de la futura sociedad responsable del tratamiento, ambos pendientes |

---

## 12. Impacto en documentos existentes

**[INTERPRETACIÓN]**

- **`VEGA_LIA_Segmento_B_v1.md`:** ya revisado para incorporar la distinción entre dependencia técnica actual y necesidad jurídica (bloque 5.B), las reducciones de retención implementadas (bruto ~2h, derivado 24h) y el resultado de la prueba técnica de minimización geográfica (bloque 8).
- **`VEGA_Analisis_Art14_Segmento_B_v1.md`:** no requiere cambios de fondo — su tratamiento del art. 14 como obligación independiente es coherente con la corrección aplicada en este documento (bloque 10).
- **Política de privacidad:** cuando se redacte la sección específica del segmento B, debe declararse el interés legítimo como base jurídica en los términos estrechos del bloque 5.A, con las retenciones reales (una vez implementadas las reducciones propuestas), no las de 24h/30 días originales.
- **Interfaz del segmento B:** no se modifica en este documento; las decisiones de diseño (reducción de retenciones) siguen pendientes de implementación.

No se ha modificado ningún archivo. Este es el análisis completo, en su versión final aprobada.
