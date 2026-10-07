# Análisis específico — Artículo 14 RGPD aplicado al Segmento B de Vega v1

**Naturaleza:** Análisis separado del LIA (`VEGA_LIA_Segmento_B_v1.md`), centrado exclusivamente en el art. 14 RGPD. Distingue **[HECHO]** / **[NORMA/CRITERIO OFICIAL]** (con cita) / **[INTERPRETACIÓN]** (no vinculante). No sustituye la revisión jurídica externa ya solicitada en `VEGA_Paquete_Revision_Juridica_Externa_v1.md`.

---

## 1. Hechos relevantes para Art. 14

**[HECHO]**

- Los datos de la segunda persona (fecha, hora opcional, lugar con coordenadas, zona horaria) proceden exclusivamente del usuario principal — nunca se obtienen directamente de ella.
- Categorías de datos: únicamente datos estructurados de nacimiento. No se recogen nombre, apellidos, email, teléfono ni dirección.
- No existe relación directa entre Vega y la segunda persona: no visita el producto, no crea sesión, no recibe comunicación alguna.
- No existe, por diseño actual, ningún canal de comunicación individual con ella — no hay ningún dato que permita contactarla directamente.
- Retención: dato en bruto — borrado inmediato tras el cálculo, máximo técnico de 1 hora como fallback (hasta ~2 horas reales por la cadencia horaria del cron), reducido desde 24 horas el 2026-10-07; resultado derivado — vigencia de 24 horas (reducida desde 30 días el 2026-10-07), exclusivamente para continuidad/reintentos de corto plazo; tras esas 24h no se reutiliza (verificado en el propio código de lectura), con eliminación física en el siguiente ciclo de purga horario dedicado (hasta ~1h de margen adicional) — ver `VEGA_Base_Juridica_Segmento_B_v1.md`.
- Tráfico real de usuarios permanece suspendido (`EXPERIMENT_ACCEPTING_REAL_TRAFFIC = false`); el sistema solo es accesible mediante tráfico de prueba.
- **Flujo de disclosure hacia terceros proveedores:** el dato en bruto de la segunda persona se envía a Railway/Vega (servicio de cálculo) prácticamente de inmediato tras su introducción, dentro del mismo flujo de generación de la lectura; a continuación, evidencia ya calculada y filtrada (no el dato en bruto) se envía a OpenAI; el dato en bruto se almacena en Supabase durante ese breve intervalo. Esta cadena de envíos está prevista de antemano en el diseño del producto — no es una comunicación posterior ni eventual, sino parte del flujo normal e inmediato de la funcionalidad.

---

## 2. Aplicabilidad del Art. 14

**[NORMA/CRITERIO OFICIAL]**

- Art. 14.1 RGPD: cuando los datos personales no se han obtenido del interesado, el responsable debe facilitarle determinada información (identidad del responsable; fines y base jurídica; categorías de datos; destinatarios o categorías de destinatarios; transferencias internacionales si las hubiera).
- Art. 14.2 añade: plazo de conservación; derechos del interesado (incluida la oposición); derecho a reclamar ante una autoridad de control; y, en particular, el **origen de los datos** (art. 14.2.f).
- **Art. 4.9 RGPD define "destinatario"** como "la persona física o jurídica, autoridad pública, servicio u otro organismo al que se comuniquen datos personales, se trate o no de un tercero." La definición es deliberadamente amplia y **no excluye a los encargados del tratamiento** por el mero hecho de actuar bajo instrucciones del responsable — el texto dice expresamente "se trate o no de un tercero".
- Art. 14.3 fija el momento de cumplimiento en tres supuestos: (a) dentro de un plazo razonable, como máximo un mes desde la obtención; (b) si los datos se usan para comunicarse con el interesado, a más tardar en la primera comunicación; **(c) si se prevé la comunicación a otro destinatario, a más tardar en el momento en que los datos se comuniquen por primera vez a ese destinatario.**

**[INTERPRETACIÓN]**

- **Formulación condicional de la aplicabilidad:** si los datos tratados sobre la segunda persona se consideran datos personales de una persona identificada o identificable, el art. 14 resulta aplicable, porque esos datos no se obtienen directamente de ella. **Esta formulación es condicional, no categórica** — la cuestión previa de si esos datos constituyen efectivamente datos personales del tercero a efectos del RGPD sigue siendo, exactamente, la **pregunta 1 original** de `VEGA_Segmento_B_Revision_Juridica_v1.md` ("¿Los datos tratados en este diseño deben considerarse datos personales del tercero a efectos del RGPD?"), todavía sin resolver por la revisión jurídica externa. Este análisis de art. 14 asume, a efectos de poder avanzar el razonamiento, una respuesta afirmativa a esa pregunta 1 — pero esa asunción no debe presentarse como una conclusión ya cerrada.
- **Art. 14.3.c — análisis explícito, no descartado:**
  - **¿Railway, OpenAI y (en su caso) Supabase cuentan como "destinatarios" a efectos del art. 14.3.c?** Dado que el art. 4.9 define "destinatario" sin excluir a los encargados del tratamiento ("se trate o no de un tercero"), existe un argumento textual razonable para que los tres cuenten como destinatarios: Railway recibe el dato en bruto; OpenAI recibe evidencia derivada que podría considerarse personal según la respuesta a la pregunta 1 citada arriba; Supabase almacena el dato en bruto como presunto encargado. **No se concluye aquí que los tres sean "destinatarios" en el sentido que activa el art. 14.3.c** — existe una lectura alternativa, también defendida en la práctica, según la cual los encargados que procesan datos exclusivamente por instrucción del responsable y sin fines propios se informan de forma agregada como "categorías de destinatarios" en el contenido del art. 14.1.e, sin que cada uno de ellos dispare individualmente el plazo específico del art. 14.3.c. Ambas lecturas son defendibles; esta es, con los hechos conocidos, una cuestión interpretativa abierta, no resuelta por una fuente oficial inequívoca localizada en esta investigación.
  - **¿Desplaza esto en la práctica el plazo general de un mes del art. 14.3.a?** Si se adoptara la lectura más amplia (Railway/OpenAI/Supabase cuentan como destinatarios a efectos del 14.3.c), y dado que el envío de datos a esos destinatarios está previsto de antemano y ocurre prácticamente de inmediato tras la recogida (bloque 1), el efecto práctico sería que el plazo relevante no sería "hasta un mes", sino "en el momento de la primera comunicación" — es decir, un plazo mucho más exigente, próximo al momento mismo de la recogida. Esto no se concluye de forma automática, pero es una consecuencia que debe tomarse en serio si se opta por la lectura amplia del art. 4.9: reforzaría la necesidad de que la información ya esté disponible de forma general (bloque 6) **antes** de que el flujo normal del producto envíe los datos a esos proveedores, en lugar de confiar en un plazo de un mes que, bajo esa lectura, no sería el aplicable.
  - **No se mantiene que el art. 14.3.c sea irrelevante solo porque Vega no se comunica directamente con la segunda persona** — esa irrelevancia solo se sostenía respecto al art. 14.3.b (comunicación directa con el interesado), no respecto al 14.3.c (comunicación a *otro* destinatario, que es un supuesto distinto y sigue siendo relevante).
- **¿El borrado del dato en bruto en menos de 1 hora modifica la obligación?** No. La obligación de información nace en el momento en que los datos se obtienen/procesan, no en el momento en que dejan de existir. El borrado posterior no extingue retroactivamente una obligación que ya nació en el momento de la recogida (y, bajo la lectura amplia del punto anterior, posiblemente ya en el momento de la primera comunicación a un destinatario, que ocurre antes incluso del borrado).

---

## 3. Art. 14.5.b — imposibilidad o esfuerzo desproporcionado

**[NORMA/CRITERIO OFICIAL]** El art. 14.5.b exime de la obligación de los apartados 1, 2 y 4 "cuando la comunicación resulte imposible o suponga un esfuerzo desproporcionado (...), o en la medida en que la obligación (...) pueda imposibilitar u obstaculizar gravemente el logro de los objetivos de dicho tratamiento." En tales casos, el responsable debe adoptar medidas adecuadas para proteger los derechos del interesado, "incluida la puesta a disposición del público de la información."

Las Directrices del Grupo de Trabajo del art. 29 sobre transparencia (**WP260 rev.01**, 12 de diciembre de 2017, refrendadas por el EDPB) desarrollan esta excepción:

- Contempla tres supuestos distintos: (i) imposibilidad; (ii) esfuerzo desproporcionado; (iii) que facilitar la información haga imposible o perjudique gravemente el logro de los fines del tratamiento.
- **"Imposible" es binario**: no existen grados de imposibilidad.
- **"Esfuerzo desproporcionado" exige una ponderación** entre el esfuerzo del responsable y el impacto sobre el interesado de no ser informado.
- El **Recital 62 RGPD** ofrece factores orientativos: número de interesados, antigüedad de los datos, garantías adecuadas adoptadas.
- Medidas sustitutivas que WP260 identifica: información pública, DPIA, pseudonimización, minimización de datos y del plazo de conservación, medidas técnicas/organizativas de seguridad.

**[INTERPRETACIÓN]**

- La diferencia entre "imposible" y "esfuerzo desproporcionado" importa: Vega podría plantear imposibilidad literal (no existe dato de contacto) en lugar de esfuerzo desproporcionado (que presupone que la información existe pero es costosa de usar).
- Aplicación restrictiva: la excepción está pensada sobre todo para archivo/investigación/estadística con grandes volúmenes — no es una cláusula general de "no tenemos cómo contactar".
- La ausencia de datos de contacto creada por minimización puede formar parte de los hechos a valorar, pero no prueba automáticamente la excepción — aceptar eso vaciaría de contenido el art. 14 para cualquier responsable que elija no recoger datos de contacto.
- El responsable debe poder documentar que realizó el ejercicio de ponderación y adoptó medidas sustitutivas.

---

## 4. ¿Puede Vega apoyarse razonablemente en Art. 14.5.b?

**Resultado: Posible pero no suficientemente seguro.**

**[INTERPRETACIÓN]**

A favor: ausencia literal de cualquier dato de contacto; volumen mínimo y retención muy corta.

En contra: el escenario no coincide con los supuestos paradigmáticos de WP260/Recital 62; existe una alternativa menos gravosa no evaluada (usar al propio usuario como intermediario de un aviso); no se ha documentado ningún ejercicio de ponderación formal; riesgo de que la excepción se perciba como "autoconstruida" por una decisión de diseño.

**Conclusión:** hipótesis razonable para seguir explorando, no una exención ya resuelta.

---

## 5. Medidas sustitutivas si se invoca Art. 14.5.b

**[NORMA/CRITERIO OFICIAL]** Art. 14.5.b in fine (medidas adecuadas, incluida la información pública); art. 12 RGPD (transparencia y facilitación del ejercicio de derechos, de aplicación general); arts. 15-21 RGPD (acceso, rectificación, supresión, limitación, portabilidad, oposición — derechos generales, no creados por el art. 14.5.b).

**[INTERPRETACIÓN] — separación explícita de dos conjuntos de obligaciones distintos**

**(A) Obligaciones específicas del art. 14.5.b, si se invoca esa excepción concreta:**
- Adoptar "medidas adecuadas" para proteger los derechos del interesado.
- Puesta a disposición del público de la información (bloque 6) — esta es la medida que el propio texto del art. 14.5.b menciona expresamente como mínimo.
- Documentar el ejercicio de ponderación que sustenta la invocación de la excepción (bloques 3-4).

**(B) Obligaciones generales de derechos (arts. 12 y 15-21), que existen con independencia de si se invoca o no el art. 14.5.b:**
- El derecho de acceso, rectificación, supresión, limitación y oposición de cualquier interesado no nace del art. 14.5.b ni depende de él — son derechos generales del RGPD que la segunda persona tendría de todos modos, se cumpla o no individualmente el art. 14.
- El art. 12 exige que el responsable facilite el ejercicio de esos derechos de forma accesible, con independencia de cómo se haya resuelto la cuestión informativa previa del art. 14.
- **El canal de derechos para la segunda persona (bloque 8) no deriva literalmente "solo" del art. 14.5.b.** Existiría como obligación de todos modos en virtud de los arts. 12 y 15-21, simplemente porque la segunda persona es (bajo la asunción condicional del bloque 2) un interesado con datos tratados por Vega. El art. 14.5.b añade, encima de eso, el requisito adicional y específico de hacer pública la información cuando no se informa individualmente — pero no es la fuente de la obligación general de atender derechos.

**Clasificación obligatorio / recomendable / opcional:**

- **Obligatorio:** información pública específica (A); mantener operativo el derecho de oposición y el resto de derechos generales (B, con independencia de A); un canal mínimo para solicitudes (B).
- **Recomendable:** documentar formalmente el ejercicio de ponderación del bloque 4; evaluar la alternativa de aviso vía el usuario antes de descartarla.
- **Opcional:** DPIA formal específica; medidas de pseudonimización adicionales a las ya existentes.

---

## 6. Información pública necesaria para Segmento B

**[INTERPRETACIÓN]** Contenido mínimo si se invoca el art. 14.5.b:

1. Que el servicio incluye una modalidad (segmento B) en la que un usuario puede introducir datos de nacimiento de una segunda persona.
2. Qué datos exactos se piden sobre ella.
3. Que esos datos proceden del usuario, no de la segunda persona directamente.
4. La finalidad: calcular una lectura de compatibilidad astrológica.
5. La base jurídica invocada, si finalmente es interés legítimo, con referencia a que existe un LIA.
6. Los destinatarios o categorías de destinatarios (Supabase, el servicio de cálculo, OpenAI).
7. El plazo de conservación exacto.
8. Identidad del responsable (o, mientras no esté decidida, que está pendiente).
9. Los derechos disponibles para la segunda persona y cómo ejercerlos, remitiendo al canal del bloque 8.
10. El derecho a reclamar ante la AEPD.
11. Mención expresa de que esta información se publica como mecanismo sustitutivo del art. 14.5.b.

**[INTERPRETACIÓN — identidad del responsable: dos momentos distintos]** Debe distinguirse entre dos momentos:

- **Durante este análisis interno**, es correcto que el punto 8 de la lista anterior conste como "identidad del responsable pendiente de decisión", puesto que así es el estado real hoy.
- **Antes de tráfico real, la política pública no puede resolver este requisito dejando simplemente "responsable pendiente".** El art. 14.1.a exige identidad y datos de contacto reales del responsable (y, en su caso, representante y DPD) — una vez decidida esa identidad, la política pública debe contener esos datos reales, no un marcador de "pendiente". **La identidad del responsable es, por ello, una dependencia bloqueante para publicar la versión definitiva de esta información**, no solo una casilla más de la lista.

---

## 7. Artículo 11 RGPD — tratamiento que no requiere identificación

**[NORMA/CRITERIO OFICIAL]**

- Art. 11.1 RGPD: si las finalidades para las que un responsable trata datos personales no requieren o ya no requieren la identificación del interesado, el responsable no estará obligado a mantener, obtener o tratar información adicional para identificar al interesado con el único fin de cumplir el RGPD.
- Art. 11.2 RGPD: cuando, en esos casos, el responsable pueda demostrar que no está en condiciones de identificar al interesado, deberá informarle de ello, si es posible. **En tales casos, los arts. 15 a 20 no se aplicarán**, salvo que el interesado, para ejercer sus derechos conforme a esos artículos, facilite información adicional que permita su identificación.
- **Art. 12.2 RGPD** establece, de forma más amplia: "el responsable facilitará el ejercicio de los derechos del interesado con arreglo a los artículos 15 a 22. En los casos a que se refiere el artículo 11, apartado 2, el responsable no se negará a actuar a petición del interesado para ejercer sus derechos en virtud de los artículos 15 a 22, salvo que el responsable demuestre que no está en condiciones de identificar al interesado." Es decir, el art. 12.2 extiende expresamente a los arts. 15-22 (no solo a los 15-20 que menciona el art. 11.2) la misma condición de "demostrar que no se está en condiciones de identificar".

**[INTERPRETACIÓN]**

- Vega no debe recopilar datos adicionales de la segunda persona (p. ej. nombre o email) únicamente para poder identificarla a efectos de gestionar eventuales solicitudes de derechos, si la finalidad del tratamiento (calcular la sinastría) no lo necesita. Esto es coherente con, y refuerza, la minimización ya aplicada — el art. 11.1 confirma que no hacerlo no es un defecto de diseño, sino lo que la norma espera.
- **Si Vega demuestra que no está en condiciones de identificar a la segunda persona** (lo cual, con el diseño actual, es plausible dada la ausencia de cualquier dato de contacto o identificador), **los arts. 15 a 20 pueden no resultar operativos** mientras esa persona no aporte, por iniciativa propia, información adicional que permita identificar el tratamiento concreto que le afecta.
- **El art. 11.2 menciona expresamente los arts. 15 a 20, no el art. 21. Por tanto, el derecho de oposición del art. 21 no queda jurídicamente desactivado por el art. 11.2** — sigue existiendo como derecho. Sin embargo, el **art. 12.2** permite al responsable no actuar sobre una solicitud de los arts. 15 a 22 (lo que incluye expresamente el art. 21) cuando pueda demostrar que no está en condiciones de identificar al interesado que la plantea. **Consecuencia:** el derecho de oposición existe en abstracto, pero su ejercicio práctico frente a Vega también requiere que Vega pueda vincular, con suficiente seguridad, la solicitud concreta con un tratamiento concreto. No es que el art. 21 esté "plenamente aplicable con independencia de la dificultad de identificación" — es que el art. 21 no se extingue por el art. 11.2, pero su ejercicio queda sujeto a la misma condición práctica de identificación suficiente que el art. 12.2 impone para el resto de derechos de los arts. 15-22.
- Esto no elimina el art. 14 ni el deber de transparencia, que no dependen de la identificación del solicitante.
- **Consecuencia directa para el diseño del procedimiento manual (bloque 8):** el art. 11 no es un fundamento para no informar en absoluto, sino un fundamento para diseñar un procedimiento que no presuma identificación previa por parte de Vega, sino que dependa de que la propia persona aporte, de forma voluntaria y proporcional, la información mínima necesaria para que Vega pueda localizar el tratamiento concreto que la afecta — y que, si esa información no llega a ser suficiente, Vega pueda explicar la limitación conforme a los arts. 11.2 y 12.2 en lugar de simplemente ignorar la solicitud.

---

## 8. Canal para la segunda persona

**[INTERPRETACIÓN]** Problemas identificados: identificación, verificación, localización del dato, riesgo de revelar información a un tercero equivocado.

**Procedimiento manual mínimo y prudente, conforme al art. 11, al art. 12.2 y a la separación del bloque 5:**

1. Canal de contacto único (el email de privacidad, una vez exista) para cualquier persona que se identifique como la segunda persona de un segmento B.
2. **La solicitud inicial no pide "quién introdujo los datos" ni ningún dato que presuponga que Vega ya sabe localizar el tratamiento.** En su lugar, se solicita a la persona que aporte, de forma voluntaria, la información mínima y proporcional que razonablemente podría conocer y que ayude a localizar el tratamiento concreto — por ejemplo, una ventana aproximada de fechas, y su propia fecha de nacimiento (el dato que, si el tratamiento existió, habría sido introducido sobre ella). No se le pide identificar a la otra persona ni ningún dato que Vega no necesitaría de otro modo.
3. **El derecho de oposición (y el resto de derechos de los arts. 15-22) existe, pero Vega no confirma, modifica ni elimina un tratamiento concreto mientras no pueda identificar con suficiente seguridad el tratamiento correspondiente al solicitante** (art. 12.2 RGPD). Mientras no se alcance ese nivel de verificación con la información aportada, la respuesta inicial es genérica: cómo funciona el segmento B, qué plazos de retención aplican, y qué tipo de información adicional ayudaría a continuar — sin confirmar ni negar que exista un registro concreto.
4. **Si, con la información aportada, Vega no puede identificar con una seguridad razonable el tratamiento correspondiente**, se informa de esa limitación expresamente, conforme al art. 11.2 (para los derechos de los arts. 15-20) y al art. 12.2 (para el resto, incluida la oposición del art. 21), sin revelar ningún dato ni confirmar la existencia de otros registros no relacionados.
5. **Si el interesado aporta información adicional suficiente para identificar con razonable seguridad el tratamiento concreto, se tramita entonces la oposición u otro derecho aplicable conforme al art. 21 (u otros arts. 15-20 según corresponda)**, dado el estado del dato:
   - Si el dato en bruto ya se ha borrado (lo más probable, dado el plazo de 1 hora): se informa de que no existe ya ningún dato en bruto que mostrar, rectificar o suprimir.
   - Si el resultado derivado aún existe (dentro de las 24 horas): se procede a su borrado mediante una acción manual equivalente a la ya existente para el propio usuario (`deletePartnerDerivedProfile`/`deletePreviewsForFlowAttempt`), accionada por el equipo, no de autoservicio.
6. Se documenta cada solicitud atendida (quién, cuándo, qué se hizo, qué nivel de verificación se alcanzó), sin registrar datos adicionales de la persona más allá de lo estrictamente necesario para tramitar la solicitud concreta.

Este procedimiento es manual y de bajo volumen esperado — no se propone ninguna automatización.

---

## 9. Relación con el LIA

**[INTERPRETACIÓN]** Resolver el art. 14 (incluyendo el matiz del art. 14.3.c y el art. 11/12.2) movería la conclusión del LIA (`VEGA_LIA_Segmento_B_v1.md`) hacia una posición más sólida, pero no la cerraría por sí solo — persiste el factor de "expectativas razonables" del test de ponderación del art. 6.1.f (bloque 4 del LIA), y la identidad del responsable sigue sin decidir. No se modifica el LIA en este documento.

---

## 10. Conclusión operativa

**Qué podemos hacer nosotros (sin asesoría externa):**
- Evaluar formalmente la alternativa de "aviso vía el usuario" antes de descartar la imposibilidad del art. 14.5.b.
- Documentar internamente el ejercicio de ponderación del art. 14.5.b.
- Diseñar (no implementar todavía) el procedimiento manual del bloque 8, apoyado en los arts. 11 y 12.2.
- Preparar la lista de contenidos mínimos del bloque 6.
- Decidir, como cuestión interna previa, qué lectura se adopta sobre si Railway/OpenAI/Supabase cuentan como "destinatarios" a efectos del art. 14.3.c, documentando los argumentos de ambas lecturas aunque no se resuelva con certeza.

**Qué habría que documentar:**
- El ejercicio de ponderación esfuerzo/impacto del art. 14.5.b.
- La decisión sobre si se invoca "imposibilidad" o "esfuerzo desproporcionado".
- El procedimiento manual del bloque 8.
- La postura adoptada sobre el art. 14.3.c y su efecto en el plazo aplicable.

**Qué cambios mínimos serían necesarios antes de tráfico real:**
- Decidir la identidad del responsable (bloqueante también para la versión pública de la información del bloque 6).
- Añadir la información mínima del bloque 6 a la política pública, con los datos reales del responsable, no un marcador de "pendiente".
- Tener operativo, aunque sea manual, el canal del bloque 8.
- Contar con asesoría externa sobre si el conjunto es jurídicamente suficiente, incluyendo específicamente la pregunta de si Railway/OpenAI/Supabase activan el art. 14.3.c.

**Qué parte seguiría siendo jurídicamente incierta incluso tras estos cambios:**
- Si la excepción del art. 14.5.b resulta finalmente defendible (bloque 4).
- Si Railway/OpenAI/Supabase cuentan como "destinatarios" a efectos del art. 14.3.c, y si eso desplaza el plazo aplicable (bloque 2) — pregunta genuinamente abierta, no resuelta con una fuente oficial inequívoca en esta investigación.
- Si las medidas sustitutivas propuestas son "adecuadas" en el sentido exigido por la norma.
- El factor de "expectativas razonables" del test de ponderación del art. 6.1.f, que excede el alcance de este análisis.

---

## 11. Matriz final

| Cuestión | Fuente oficial | Conclusión | Confianza | Acción necesaria | Bloqueante |
|---|---|---|---|---|---|
| Aplicabilidad del art. 14 | Art. 14.1-14.4 RGPD | Condicional: aplica si los datos de la segunda persona son datos personales de ella (pregunta 1 original del segmento B, aún abierta) | Alto (condicional) | Ninguna acción adicional; esperar resolución de la pregunta 1 | No, en sí misma — depende de la pregunta 1 |
| Destinatarios y art. 14.3.c | Art. 4.9 RGPD; art. 14.3.c RGPD | Abierto: Railway/OpenAI/Supabase podrían contar como destinatarios bajo una lectura amplia del art. 4.9; no resuelto con fuente oficial inequívoca | Bajo-moderado | Decisión interna documentada + consulta a asesoría | Sí, condicionalmente — afecta qué plazo rige |
| Momento de la obligación (art. 14.3.a vs. c) | Art. 14.3 RGPD | Si aplica 14.3.c, el plazo se adelanta a la primera comunicación (casi inmediata), no un mes | Moderado | Diseñar la información pública asumiendo el plazo más exigente | Sí |
| Distinción imposible vs. esfuerzo desproporcionado | WP260 rev.01 | Son conceptos distintos; Vega debe elegir uno y justificarlo | Alto | Decidir formalmente cuál se invoca | Sí |
| ¿Aplica 14.5.b en el caso de Vega? | Art. 14.5.b RGPD; WP260; Recital 62 | Posible pero no suficientemente seguro | Moderado-bajo | Evaluar alternativa de aviso vía usuario; documentar ponderación | Sí |
| Medidas sustitutivas específicas del 14.5.b | Art. 14.5.b in fine; WP260 | Información pública + documentación de la ponderación | Alto | Implementar antes de invocar la excepción con seguridad | Sí |
| Obligaciones generales de derechos (independientes del 14.5.b) | Art. 12, 15-21 RGPD | Existen con independencia de si se invoca el 14.5.b | Alto | Canal mínimo operativo (bloque 8) | Sí |
| Art. 11 / Art. 12.2 / Art. 21 — oposición y identificación | Art. 11.2 RGPD; Art. 12.2 RGPD | El art. 21 no queda desactivado por el art. 11.2, pero su ejercicio práctico requiere identificación suficiente conforme al art. 12.2 | Alto | Diseñar el procedimiento manual conforme a esta distinción (bloque 8) | Sí |
| Información pública mínima (bloque 6) | Art. 14.1-14.2 RGPD | Enumerada; no redactada | Alto | Redactar e incorporar a política pública | Sí (depende también de responsable efectivo) |
| Identidad del responsable en la información pública | Art. 14.1.a RGPD | Pendiente aceptable solo en el análisis interno; bloqueante para la versión pública definitiva | Alto | Decidir identidad del responsable antes de publicar la información del bloque 6 | Sí |
| Canal para la segunda persona (bloque 8) | Principio de responsabilidad proactiva; arts. 11, 12, 21 RGPD | Procedimiento manual diseñado, no implementado | Moderado | Aprobar e implementar | Sí |
| Relación con el LIA | — | Mejora la posición pero no la cierra | Moderado | Revisar el LIA una vez resuelto lo anterior | No (nota, no bloqueante autónomo) |

---

**Nota de transparencia sobre fuentes:** se intentó recuperar el texto completo de la FAQ oficial de la AEPD sobre esta misma pregunta y el texto íntegro de WP260 en PDF, pero ambas consultas fallaron técnicamente (error de servidor en la AEPD; PDF no legible por la herramienta de extracción). Las citas de WP260 provienen de fragmentos verificados mediante búsqueda directa de las frases exactas del documento, no de una lectura completa del PDF.

No se ha modificado ningún otro archivo.
