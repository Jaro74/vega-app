# VEGA — Revisión Jurídica Interna: Conservación Probatoria de `free_text_consent_events` v1

**Estado:** Revisión jurídica interna cerrada (2026-10-11). Conclusión: **CERRABLE
INTERNAMENTE**. No activa consulta jurídica externa.

**Naturaleza:** Análisis preparatorio, no vinculante, basado en fuentes oficiales (RGPD/EUR-Lex,
EDPB, LOPDGDD/BOE, Ley 40/2015/BOE, Código Civil). Distingue **[HECHO]** / **[NORMA/CRITERIO
OFICIAL]** (con cita) / **[INTERPRETACIÓN]** (no vinculante).

**Alcance:** esta revisión estudia una única cuestión — si el plazo actual de conservación
probatoria de `free_text_consent_events` (12 meses desde el evento terminal, calificado como
"provisional") es jurídicamente defendible y proporcionado, y si `/delete-all` debe seguir
eliminando esos eventos. **No reabre:** art. 9 de terceros (ya escalado a consulta externa); el
checkbox 6.1.a+9.2.a (ya cerrado internamente); el principio de producto no negociable;
`free_text` v2; el filtro de identificadores directos; el Segmento B/LIA; la retención del
contenido principal del `free_text`/`previews`; ni Railway/`vega-api`. **No implementa ningún
cambio técnico** — todas las implicaciones técnicas/documentales quedan señaladas como
pendientes, sin ejecutarse aquí.

---

## 1. Contexto real de Vega

- `free_text` se basa en consentimiento (6.1.a + 9.2.a, ya cerrado en
  `VEGA_Revision_Checkbox_FreeText_Art6_Art9_v1.md`).
- `free_text_consent_events`: historial append-only, con `action` en `granted|withdrawn|expired`
  y `consent_version`. El estado vigente es siempre el último evento por `seq`.
- `free_text_consent_versions`: catálogo del texto exacto de consentimiento por versión.
- La finalidad de estos eventos es poder demostrar el consentimiento y su ciclo de vida.
- La conservación actualmente documentada es 12 meses desde el evento terminal (`withdrawn` o
  `expired`), calificada como "provisional".
- Un nuevo `grant` abre un nuevo ciclo.
- `/delete-all` normalmente elimina también los eventos de consentimiento del intento
  correspondiente.
- No se quiere conservar más de lo necesario.

---

## 2. Fuentes oficiales verificadas

- **RGPD** (EUR-Lex): arts. 5.1.e, 5.2, 7.1, 17.3.e, 24.
- **EDPB, Guidelines 05/2020 on consent**, §105-108 y §117-119 (verificados párrafo por párrafo en
  la revisión del checkbox, `VEGA_Revision_Checkbox_FreeText_Art6_Art9_v1.md`).
- **LOPDGDD (Ley Orgánica 3/2018), art. 32** — verificado directamente contra el texto consolidado
  de BOE.es: *"El responsable del tratamiento estará obligado a bloquear los datos cuando proceda
  a su rectificación o supresión."* El bloqueo consiste en "la identificación y reserva de los
  mismos, adoptando medidas técnicas y organizativas", "excepto para la puesta a disposición de
  los datos a los jueces y tribunales, el Ministerio Fiscal o las Administraciones Públicas
  competentes... para la exigencia de posibles responsabilidades derivadas del tratamiento, y solo
  por el plazo de prescripción de las mismas. Transcurrido ese plazo deberá procederse a la
  destrucción de los datos." El art. 32.3 añade que los datos bloqueados no pueden tratarse para
  ninguna finalidad distinta de la señalada.
- **LOPDGDD, art. 72.1** — verificado directamente contra BOE.es: califica como infracciones muy
  graves, con prescripción a los tres años: letra c) *"El incumplimiento de los requisitos
  exigidos por el artículo 7 del Reglamento (UE) 2016/679 para la validez del consentimiento"*;
  letra e) *"El tratamiento de datos personales de las categorías a las que se refiere el artículo
  9 del Reglamento (UE) 2016/679... sin que concurra alguna de las circunstancias previstas en
  dicho precepto."* El art. 72.2 extiende el mismo plazo de 3 años a las infracciones del art.
  83.6 RGPD.
- **Ley 40/2015 (Régimen Jurídico del Sector Público), art. 30.2**: la prescripción de una
  infracción administrativa se computa desde el día en que se cometió, o, si es continuada o
  permanente, desde que finalizó la conducta infractora.
- **Código Civil, art. 1964** (tras la Ley 42/2015): plazo general de prescripción de acciones
  personales sin plazo especial, 5 años.
- **Código Civil, art. 1968.2**: sigue fijando, en su redacción vigente, un año para la
  responsabilidad extracontractual del art. 1902 — no modificado por la Ley 42/2015, que solo
  afectó al art. 1964. No se usa como criterio principal de calibración para Vega (sección 7).

---

## 3. Art. 7.1 RGPD — demostrabilidad

**[INTERPRETACIÓN]** El art. 7.1 exige poder demostrar el consentimiento mientras el tratamiento
basado en él esté en curso. El deber de demostrabilidad no se extingue automáticamente en el
instante de la retirada — una persona puede reclamar, después de retirar su consentimiento, que
este nunca fue válido. El art. 7.1 no obliga por sí mismo a conservar evidencia después de la
retirada, pero el art. 5.1.e, combinado con el art. 17.3.e RGPD y el mecanismo de bloqueo del art.
32 LOPDGDD, es el marco que permite y, en caso de supresión, **exige** justificar esa conservación
posterior, para una finalidad distinta (accountability/defensa) de la finalidad original (generar
la interpretación).

## 4. Art. 5.1.e RGPD — limitación del plazo de conservación

**[INTERPRETACIÓN]** La finalidad de `free_text_consent_events` no es la misma finalidad que la
del `free_text` en sí, sino una finalidad evidenciaria/de responsabilidad distinta. Para esa
finalidad concreta, "lo necesario" se mide por cuánto tiempo Vega podría razonablemente necesitar
defenderse de una reclamación relativa a ese consentimiento — un criterio que el propio art. 32
LOPDGDD ata expresamente al plazo de prescripción de las responsabilidades correspondientes.

## 5. Art. 5.2 y Art. 24 RGPD — accountability

**[INTERPRETACIÓN]** Respaldan positivamente la existencia de alguna conservación evidenciaria —
borrar toda constancia de consentimiento inmediatamente tras la retirada debilitaría la capacidad
de Vega de demostrar que, en su momento, actuó conforme al RGPD. La tensión entre minimización
(5.1.e) y accountability (5.2/24) no se resuelve eliminando toda prueba, sino acotando su alcance
(qué se guarda: versión, timestamp, tipo de evento, identificador técnico mínimo — nunca el
contenido del `free_text`) y su duración.

## 6. Art. 17 RGPD y art. 32 LOPDGDD — efecto de una solicitud de supresión

**[NORMA/CRITERIO OFICIAL]** El art. 32.1 LOPDGDD **obliga** a bloquear los datos cuando procede
su rectificación o supresión — no es una facultad discrecional del responsable. `free_text_consent_events`
son datos personales vinculados técnicamente al `flow_attempt_id`/usuario, igual que cualquier otro
registro técnico ya tratado como dato personal en este proyecto.

**[INTERPRETACIÓN] Tres regímenes distinguidos:**

- **(a) Supresión del contenido operativo** (`free_text` en bruto, `previews` generadas con él):
  sigue su régimen ya cerrado, sin cambios — no hay ninguna finalidad de responsabilidad derivada
  del tratamiento que dependa de conservar el *contenido* del texto en sí.
- **(b) Bloqueo de la evidencia probatoria mínima** (`free_text_consent_events`): cuando procede
  una supresión (incluido `/delete-all`), el art. 32 LOPDGDD exige bloquearlos — no destruirlos de
  inmediato ni conservarlos accesibles para las funcionalidades ordinarias del producto. El bloqueo
  no es un simple flag técnico: su implementación futura deberá garantizar que los datos bloqueados
  **no sean accesibles ni utilizables por los flujos ordinarios** de Vega, y queden reservados
  exclusivamente para las finalidades legalmente permitidas de exigencia/defensa de
  responsabilidades.
- **(c) Destrucción definitiva:** procede cuando hayan prescrito las responsabilidades aplicables.

## 7. Retirada (Art. 7.3) — diferencia entre retirar el consentimiento y borrar toda evidencia

**[INTERPRETACIÓN]** Retirar el consentimiento y borrar toda evidencia de que existió son dos cosas
distintas. El art. 7.3 garantiza que la retirada sea tan fácil como la concesión y que cese el
tratamiento basado en ese consentimiento — no exige borrar el registro histórico de que el
consentimiento se otorgó y luego se retiró. Conservar `granted` + `withdrawn` durante un periodo
posterior, limitado y con una finalidad evidenciaria distinta, es compatible con el art. 7.3.

## 8. Plazo — criterios para fijarlo y evaluación del plazo actual

**[NORMA/CRITERIO OFICIAL]** No existe en el RGPD ni en las Guidelines EDPB un plazo obligatorio
concreto para conservar prueba de consentimiento (EDPB §110, verificado en la revisión del
checkbox: *"There is no specific time limit in the GDPR for how long consent will last."*). El
criterio para fijarlo, conforme al art. 32 LOPDGDD, es el plazo de prescripción de las
responsabilidades potencialmente en juego.

**[INTERPRETACIÓN — corrección metodológica importante]** El art. 30.2 Ley 40/2015 fija el
*dies a quo* legal de la prescripción de una infracción administrativa en el día en que se cometió,
o, si es continuada o permanente, en el momento en que finalizó la conducta infractora — un hecho
determinado por las circunstancias reales de cada infracción concreta, **no por ninguna marca
técnica interna de Vega**. `withdrawn`/`expired` son eventos **operativos** del ciclo de vida del
consentimiento en el diseño de Vega — marcan cuándo cesa, en los sistemas de Vega, el tratamiento
basado en ese consentimiento concreto. **No equivalen, por sí solos, al *dies a quo* jurídico
universal de toda responsabilidad posible.**

**Evaluación del plazo actual (12 meses):** insuficiente como aproximación operativa prudente,
porque los dos supuestos más directamente relevantes para `free_text` (incumplimiento de los
requisitos de validez del consentimiento del art. 7 RGPD; tratamiento de categorías especiales del
art. 9 RGPD sin circunstancia válida) están clasificados, en fuente oficial verificada (art. 72.1.c
y 72.1.e LOPDGDD), como infracciones **muy graves, con prescripción a los tres años** — no graves
(2 años) ni leves (1 año). Un plazo operativo de 12 meses queda por debajo de esa referencia.

## 9. Alternativas evaluadas

- **6 meses:** insuficiente — por debajo de cualquier plazo de prescripción aplicable.
- **12 meses (actual):** corto frente al plazo de 3 años de las infracciones muy graves
  relevantes (art. 72.1.c y 72.1.e LOPDGDD).
- **24 meses:** alineado con infracciones graves (2 años) — no es la referencia correcta para los
  dos supuestos más relevantes de `free_text`, que son muy graves.
- **36 meses:** alineado con el plazo de 3 años de las infracciones muy graves relevantes — **plazo
  recomendado como política ordinaria prudente** (sección 10), no como determinación del *dies a
  quo* jurídico de toda responsabilidad posible.
- **Conservación durante toda la vida del consentimiento + X meses:** equivalente en sustancia a
  "36 meses desde el evento terminal", solo formulado de otra manera, dado que en el diseño de
  Vega el evento terminal coincide con el fin del tratamiento basado en ese consentimiento.
- **Conservación vinculada a los plazos de prescripción de posibles reclamaciones:** es el criterio
  metodológicamente correcto (art. 32 LOPDGDD) — los 36 meses son la aplicación operativa prudente
  de ese criterio en ausencia de una reclamación concreta identificada; si existiera una
  reclamación o investigación concreta, la conservación excepcional se ajusta a los plazos propios
  de ese caso (sección 10.3), no a esta cifra ordinaria.

## 10. Posición final

### 10.1 Conservación probatoria ordinaria

`free_text_consent_events` mínimos (versión, timestamp, tipo de evento, identificador técnico —
nunca el contenido del `free_text`) se conservan durante **36 meses desde el evento terminal**
(`withdrawn`/`expired`). El evento terminal es una **referencia operativa prudente** del cierre del
ciclo de consentimiento — en el diseño de Vega, coincide con el fin del tratamiento basado en ese
consentimiento — pero **no es el *dies a quo* jurídico universal de cualquier responsabilidad
posible** (sección 8). Los 36 meses se describen como un **criterio operativo conservador alineado
con el plazo de 3 años de las infracciones muy graves relevantes** (art. 72.1.c y 72.1.e LOPDGDD),
no como una determinación de cuándo empieza a correr, en Derecho, la prescripción de toda
responsabilidad imaginable.

### 10.2 Bloqueo ante supresión

Si procede una supresión, incluido `/delete-all`, la evidencia probatoria mínima **no debe
destruirse inmediatamente**. Debe pasar a un régimen de **bloqueo conforme al art. 32 LOPDGDD**:
inutilizada para las funcionalidades ordinarias del producto, no accesible ni utilizable por los
flujos ordinarios de Vega, y disponible exclusivamente para las finalidades legalmente permitidas
de exigencia/defensa de responsabilidades. El bloqueo no es un simple flag técnico — su futura
implementación deberá garantizar esa inaccesibilidad real, no solo una marca lógica ignorada por el
resto del sistema.

### 10.3 No reinicio automático del plazo por `/delete-all`

Una solicitud de supresión no abre, por sí misma, un nuevo periodo automático de 36 meses. La
referencia ordinaria sigue siendo el cierre del ciclo (evento terminal). Si existe una reclamación,
investigación o procedimiento concreto, la conservación excepcional se ajusta a las
responsabilidades y plazos aplicables a ese caso concreto (determinados por sus propios hechos,
conforme al art. 30.2 Ley 40/2015), no a la cifra ordinaria de 36 meses.

### 10.4 Destrucción definitiva

Cuando hayan prescrito las responsabilidades aplicables, los registros bloqueados deben destruirse.
Sin reclamación concreta identificada, la política ordinaria de 36 meses constituye la
**aproximación operativa establecida por Vega** para ese momento — no una prueba de que ese es,
en todo caso, el instante legal exacto de la prescripción.

### 10.5 Contenido del `free_text` y `previews`

No se conservan como prueba del consentimiento y siguen su régimen de supresión ya cerrado — sin
cambios respecto a lo ya implementado (no se reabre).

---

## 11. Nivel de confianza

**Alto.** Los hechos jurídicos centrales (art. 32 y art. 72.1 LOPDGDD, verificados directamente
contra el texto consolidado de BOE.es; art. 30.2 Ley 40/2015, consistente con doctrina
administrativa verificada; EDPB §105-119, verificados en la revisión del checkbox) están
confirmados en fuente oficial o en fuentes consistentes con ella. El único punto de confianza
moderada es la calificación exacta de qué infracción concreta se activaría en un caso real
(muy grave vs. grave) y el *dies a quo* exacto aplicable a esa infracción concreta — pero esto no
es una incertidumbre sobre el criterio metodológico disponible, sino sobre cómo se aplicaría a
hechos futuros todavía no existentes.

## 12. Conclusión

**CERRABLE INTERNAMENTE.** No activa consulta jurídica externa.

Existe un criterio legal concreto y verificado en fuente oficial (art. 32 LOPDGDD para el
tratamiento de la supresión; art. 72.1 LOPDGDD para el plazo de referencia; art. 30.2 Ley 40/2015
para el *dies a quo* correcto) suficiente para fijar una posición interna razonada, sin zonas de
ambigüedad que requieran consulta externa. La incertidumbre residual sobre la calificación exacta
de una infracción futura hipotética no es resoluble por adelantado por ningún asesor externo
tampoco — depende de hechos que todavía no existen.

---

## 13. Implicaciones técnicas/documentales (no implementadas en esta revisión)

- **Documental:** `VEGA_Consentimiento_FreeText_v1.md` debe reflejar los tres regímenes (ordinaria/
  bloqueo/destrucción) y el plazo corregido de 36 meses, sustituyendo la política única de "12
  meses, provisional".
- **Técnico — `/delete-all`:** debe dejar de destruir directamente `free_text_consent_events` y,
  en su lugar, marcarlos como bloqueados conforme al art. 32 LOPDGDD, garantizando que no sean
  accesibles ni utilizables por los flujos ordinarios del producto.
- **Técnico — `purge_expired_free_text_consent_events()`:** pasaría a ser también la vía de
  destrucción definitiva de los registros bloqueados tras la prescripción aplicable, no solo la
  purga de ciclos ordinarios cerrados a los 36 meses.
- **Técnico — migraciones/RLS/cron:** cualquier cambio en el esquema o en las políticas de acceso
  necesario para implementar el régimen de bloqueo queda pendiente de diseño e implementación
  futura.

Ninguno de estos cambios se modifica en esta revisión.
