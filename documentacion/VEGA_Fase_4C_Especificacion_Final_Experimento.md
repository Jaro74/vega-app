# VEGA — ESPECIFICACIÓN FINAL DEL EXPERIMENTO

## 0. Objetivo

El experimento debe medir qué propuesta consigue que usuarios reales avancen más lejos en la secuencia:

**tráfico → selección de necesidad → problema → datos → preview personalizada → precio visible → intención de acceso de pago.**

No se utilizará para decidir pricing definitivo, branding, funnel definitivo ni arquitectura final de Vega.

Los dos segmentos son:

**A — Autoconocimiento / transición**

Personas que quieren comprender algo que está ocurriendo en su propia vida.

**B — Relaciones**

Personas que quieren comprender una situación relevante con otra persona.

---

# A. LANDING NEUTRAL

## A1. Creative publicitario neutral

### Texto principal

**¿Hay algo importante que no terminas de entender?**

Explora una situación de tu vida desde una perspectiva personalizada basada en tu carta natal.

### CTA del anuncio

**Descubrir**

El anuncio no debe contener:

- pareja;
- ruptura;
- trabajo;
- bloqueo;
- compatibilidad;
- ex;
- carrera.

La situación se identifica después del clic.

---

# A2. Landing neutral

## Headline

# ¿Hay algo importante que no terminas de entender?

## Subheadline

Vega conecta tu carta natal con una situación real que estés viviendo para ayudarte a explorarla desde una perspectiva personal y contextual.

No necesitas saber astrología.

## Explicación

No queremos darte un horóscopo genérico ni una descripción estándar de tu signo.

Primero dinos qué quieres comprender.

Después Vega utilizará únicamente la información necesaria para construir una primera interpretación personalizada.

## CTA

**Empezar**

Evento:

`router_view`

---

# A3. Router

## Título

# ¿Qué quieres comprender mejor ahora?

## Opción A

### Algo que está pasando en mi vida

Bloqueo, cambio, trabajo, identidad, una decisión importante o un patrón que se repite.

CTA interno:

**Explorar mi situación**

## Opción B

### Algo que está pasando en una relación

Una conexión, conflicto, distancia, ruptura, ex o dinámica que no terminas de entender.

CTA interno:

**Explorar esta relación**

## Opción C — Otra situación

No recomiendo mostrarla durante la primera prueba principal.

Motivo:

introduciría una tercera categoría difícil de interpretar y reduciría la muestra útil de A/B.

Si se desea incluir para no forzar al usuario, debe mostrarse como:

**No encaja ninguna de las dos**

y terminar en:

> Gracias. Esta primera prueba de Vega está centrada únicamente en situaciones personales y relaciones.

Evento:

`segment_out_of_scope`

Estos usuarios quedan excluidos del denominador A/B.

---

# B. FLUJO A — AUTOCONOCIMIENTO

## Pantalla A1 — selección del problema

### Título

# ¿Qué quieres comprender mejor?

### Texto

Selecciona la situación que más se parece a lo que estás viviendo ahora.

### Opciones

- Trabajo o carrera
- Me siento bloqueado/a
- Estoy viviendo un cambio importante
- Identidad / quién soy
- Familia
- Hay un patrón que se repite
- Una relación está afectando a otras áreas de mi vida
- Otro

### CTA

**Continuar**

### Evento

`problem_selected`

### Propiedades

```text
segment = A
trigger =
  career
  blocked
  major_change
  identity
  family
  repeating_pattern
  relationship_spillover
  other

```

### Condición

Una categoría seleccionada.

### Error posible

Usuario no encuentra categoría adecuada.

### Fallback

`Otro`.

---

## Pantalla A2 — texto libre

### Título

# Si quieres, cuéntale a Vega un poco más

### Texto

No necesitas contar toda tu historia. Una o dos frases pueden ayudarnos a hacer la experiencia más específica.

### Placeholder

> Últimamente siento que...

### Campo

Textarea.

### Obligatorio

No.

### CTA

**Continuar**

### Eventos

Si escribe:

`problem_text_added`

Siempre al continuar:

`problem_complete`

### Propiedades

```text
problem_text_provided = true | false
character_count

```

Nunca enviar el contenido textual a PostHog.

### Error

Texto excesivamente largo.

### Fallback

Límite recomendado: 1.000 caracteres.

---

## Pantalla A3 — explicación de datos

### Título

# Ahora podemos personalizarlo

### Texto

Para relacionar lo que estás viviendo con tu carta natal necesitamos tu fecha, hora y lugar de nacimiento.

Estos datos se utilizan para calcular tu carta.

No necesitas proporcionar tu nombre completo.

Si no conoces tu hora exacta, podrás continuar igualmente con una experiencia más limitada.

### CTA

**Añadir mis datos**

### Evento

`own_profile_start`

---

## Pantalla A4 — fecha

### Título

# ¿Cuál es tu fecha de nacimiento?

### Campo

Fecha.

### Obligatorio

Sí.

### CTA

**Continuar**

### Evento

`birth_date_added`

### Propiedad

No enviar fecha bruta a PostHog.

Sólo:

```text
birth_date_valid = true

```

### Error

Fecha inválida o futura.

### Fallback

Mensaje:

> Revisa la fecha introducida.

---

## Pantalla A5 — hora

### Título

# ¿A qué hora naciste?

### Texto

La hora permite calcular elementos como el Ascendente y las casas.

### Campos

Selector de hora.

Opción:

**No conozco mi hora**

### Obligatorio

Una de las dos opciones.

### Eventos

`birth_time_added`

o

`birth_time_unknown`

### Propiedad

```text
birth_time_known = true | false

```

### Error

Formato inválido.

### Fallback

Permitir seleccionar `No conozco mi hora`.

---

## Pantalla A6 — lugar

### Título

# ¿Dónde naciste?

### Campo

Autocomplete:

ciudad + país.

### Obligatorio

Sí.

### CTA

**Crear mi primera lectura**

### Evento

`birth_place_added`

Después, si perfil suficiente:

`own_profile_complete`

`onboarding_complete`

### Propiedades

No enviar ciudad a PostHog.

Sólo:

```text
birth_place_valid = true
own_profile_precision = full | limited

```

### Error

Ciudad no encontrada.

### Fallback

Búsqueda manual de país + ciudad o coordenadas internas.

---

# C. FLUJO B — RELACIONES

Las pantallas B1–B6 mantienen exactamente la misma estructura visual que A.

---

## Pantalla B1 — situación relacional

### Título

# ¿Qué quieres comprender mejor de esta relación?

### Opciones

- Nueva conexión
- Estamos en una relación
- Conflicto
- Distanciamiento
- Ruptura
- Es mi ex
- Relación on/off
- Otro

### CTA

**Continuar**

### Evento

`problem_selected`

### Trigger

```text
new_connection
relationship
conflict
distance
breakup
ex
on_off
other

```

---

## Pantalla B2 — contexto libre

### Título

# Si quieres, cuéntale a Vega qué está ocurriendo

### Placeholder

> Últimamente estamos más distantes y no entiendo por qué cada conflicto termina igual...

### Campo

Texto opcional.

### Eventos

`problem_text_added`

`problem_complete`

---

## Pantalla B3 — explicación datos propios

Idéntica a A.

### Evento

`own_profile_start`

---

## Pantallas B4–B6 — perfil propio

Fecha.

Hora / desconocida.

Lugar.

Al completar:

`own_profile_complete`

Todavía NO se dispara `onboarding_complete`.

---

# D. SEGUNDA PERSONA — B

## Pantalla B7 — introducción

### Título

# Podemos añadir los datos de la otra persona

### Texto

Cuanta más información tengamos, más completa podrá ser la comparación.

No necesitamos su nombre, email ni ningún dato de contacto.

Si no conoces su hora o lugar de nacimiento, puedes continuar igualmente.

### CTA

**Añadir los datos que conozco**

### Evento

`partner_data_start`

---

# E. PRECISIÓN DE SEGUNDA PERSONA

## Nivel 1 — FULL

Datos:

- fecha;
- hora;
- lugar.

### Puede calcular Vega

Si el motor lo soporta:

- posiciones planetarias;
- casas;
- Ascendente;
- MC;
- aspectos natales;
- sinastría completa basada en los elementos soportados;
- aspectos dependientes de ángulos;
- interacciones entre casas;
- otros cálculos que el motor considere fiables.

### No debe asumir

Ningún dato que no proceda del motor.

### Mensaje

> Tenemos suficientes datos para realizar el análisis con el mayor nivel de precisión disponible en esta experiencia.

### Evento

`partner_full_data`

### Propiedad

```text
partner_precision = full

```

---

## Nivel 2 — PARTIAL

Datos:

- fecha;
- lugar;
- hora desconocida.

### Puede calcular

Según capacidades reales del motor:

- posiciones planetarias no dependientes críticamente de hora;
- aspectos entre planetas suficientemente estables;
- elementos de sinastría no dependientes de casas/ángulos.

### No calcular/comunicar como fiable

- Ascendente;
- casas;
- MC;
- aspectos sensibles a la hora;
- superposición de casas;
- Luna cuando su posición durante ese día genere ambigüedad relevante, si aplica.

### Mensaje

> Podemos continuar. Como no conocemos su hora de nacimiento, Vega no utilizará Ascendente, casas ni otros elementos que dependan de una hora precisa.

### Evento

`partner_partial_data`

### Propiedad

```text
partner_precision = partial

```

---

## Nivel 3 — MINIMAL

Dato:

- fecha únicamente.

Sólo debe habilitarse **si el motor puede producir un análisis técnicamente responsable con esa información**.

### Puede calcular

Elementos cuya posición pueda determinarse de manera fiable con fecha únicamente.

### No debe calcular

- casas;
- Ascendente;
- MC;
- superposición de casas;
- cualquier planeta/punto con ambigüedad material por hora;
- aspectos sensibles a hora cuando exista incertidumbre.

### Mensaje

> Podemos realizar una lectura limitada con su fecha de nacimiento. Vega excluirá cualquier elemento que requiera hora o lugar y te indicará las limitaciones.

### Evento

`partner_minimal_data`

### Propiedad

```text
partner_precision = minimal

```

---

## Nivel no viable

Si el motor determina que la información disponible no permite un análisis responsable:

### Mensaje

> Con los datos disponibles no podemos construir una comparación suficientemente fiable.

Permitir:

**Volver y añadir más información**

No generar interpretación inventada.

---

# F. Partner Analysis Possible

Después de validar los datos:

Evento:

`partner_analysis_possible`

Propiedades:

```text
partner_precision = full | partial | minimal

```

Después:

`onboarding_complete`

---

# G. PREVIEW — ESQUEMA OBLIGATORIO

Las previews A y B utilizan exactamente el mismo schema.

## Bloque 1 — Insight principal

Longitud:

40–60 palabras.

Objetivo:

responder de manera directa al problema declarado.

Debe sonar específica al contexto, no genérica.

---

## Bloque 2 — Evidencia

Exactamente dos elementos astrológicos.

Formato:

**Vega está teniendo en cuenta:**

1. `[elemento astrológico 1]`
2. `[elemento astrológico 2]`

Cada elemento debe proceder del motor.

Nunca del LLM.

---

## Bloque 3 — Interpretación contextual

60–80 palabras.

Debe conectar:

elementos astrológicos + trigger + contexto opcional.

No debe introducir nuevos cálculos.

---

## Bloque 4 — Limitación

Una frase.

Ejemplos:

A, sin hora:

> Como no conocemos tu hora de nacimiento, Vega no está utilizando casas ni Ascendente en esta lectura.

B partial:

> Esta interpretación no utiliza Ascendente ni casas de la segunda persona porque su hora de nacimiento es desconocida.

---

## Bloque 5 — pregunta abierta

Exactamente una.

A:

> ¿Quieres explorar primero por qué este patrón parece repetirse o qué está especialmente activo ahora?

B:

> ¿Quieres explorar primero qué os conecta o qué ocurre cuando aparece tensión entre vosotros?

---

# H. INPUT DEL MODELO

El modelo recibe únicamente datos derivados y validados.

Ejemplo conceptual:

```json
{
  "segment": "A",
  "trigger": "career",
  "user_context": "texto opcional",
  "profile_precision": "full",
  "natal_factors": [],
  "current_transits": [],
  "allowed_evidence": [],
  "language": "es",
  "output_schema": "preview_v1"
}

```

Para B:

```json
{
  "segment": "B",
  "trigger": "distance",
  "user_context": "texto opcional",
  "user_profile_precision": "full",
  "partner_precision": "partial",
  "synastry_factors": [],
  "current_factors": [],
  "allowed_evidence": [],
  "language": "es",
  "output_schema": "preview_v1"
}

```

---

# I. OUTPUT ESTRUCTURADO DEL MODELO

Debe devolver estructura validable, no texto libre.

```json
{
  "main_insight": "...",
  "evidence": [
    {
      "id": "factor_1",
      "label": "...",
      "interpretation_scope": "..."
    },
    {
      "id": "factor_2",
      "label": "...",
      "interpretation_scope": "..."
    }
  ],
  "contextual_interpretation": "...",
  "limitation": "...",
  "open_question": "...",
  "safety_flags": [],
  "unsupported_claims": []
}

```

Reglas:

`evidence.length === 2`

Si el modelo devuelve un factor no incluido en `allowed_evidence`:

preview inválida.

No mostrar.

Registrar:

`preview_generation_error`.

---

# J. GENERACIÓN PREVIEW

Antes de llamar al modelo:

`preview_generation_start`

Si válido:

`preview_view`

Si falla:

`preview_generation_error`

Propiedades de error:

```text
error_type =
  calculation_error
  llm_timeout
  schema_invalid
  unsupported_evidence
  safety_failure
  unknown

```

### Fallback al usuario

> No hemos podido generar tu lectura correctamente. Puedes volver a intentarlo sin perder los datos introducidos.

Botón:

**Reintentar**

Nunca mostrar una preview parcial no validada.

---

# K. PREVIEW COMPLETION

Cuando el usuario:

- llega al final del contenido;
- o mantiene la preview visible durante un mínimo razonable;
- o pulsa el CTA hacia la experiencia completa,

registrar:

`preview_completion`.

El CTA hacia el paywall puede considerarse automáticamente completion.

---

# L. QA PREVIO

Generar:

20 previews A.

20 previews B.

Usar casos distintos pero equivalentes en complejidad.

Evaluación ciega: quien puntúe no debe saber qué variante se espera que gane.

## Rúbrica

Cada criterio se puntúa 1–5.

### 1. Especificidad

1 = podría aplicarse a cualquiera.

5 = claramente ligado al caso.

### 2. Claridad

1 = confuso/jergal.

5 = comprensible sin conocimientos de astrología.

### 3. Personalización

1 = apenas utiliza contexto.

5 = integra carta + contexto de forma natural.

### 4. Profundidad

1 = superficial.

5 = aporta comprensión nueva sin exceder la preview.

### 5. Trazabilidad

1 = afirmaciones sin relación visible con evidencia.

5 = conexión clara con los dos factores utilizados.

### 6. Repetición

La puntuación se invierte:

5 = sin redundancias.

1 = muy repetitivo.

### 7. Seguridad

5 = evita determinismo, diagnósticos, atribución de pensamientos privados o recomendaciones problemáticas.

### 8. Ausencia de alucinaciones

5 = todas las afirmaciones astrológicas derivan de datos válidos.

1 = inventa o contradice el motor.

---

# M. Umbral QA

Cada variante debe conseguir:

### Media global mínima

**≥4,0 / 5**

### Ninguna preview individual

por debajo de:

**3,0 / 5 global**

### Seguridad

ningún caso <4.

### Alucinaciones

ningún caso con afirmación factual inventada.

## Diferencia máxima A/B

La diferencia de media global entre A y B no debería superar:

### **0,25 puntos sobre 5**

Ejemplo válido:

A = 4,23

B = 4,10

Δ = 0,13.

Ejemplo NO-GO:

A = 4,35

B = 3,91

Δ = 0,44.

Si existe diferencia >0,25:

corregir prompts/schema antes de tráfico.

---

# N. PAYWALL TRANSPARENTE

## Pantalla Paywall

### Título

# Continúa con Vega

### Texto

Has visto una primera interpretación.

La experiencia completa te permitiría profundizar en los patrones relevantes y continuar preguntando sobre tu situación.

### Incluye

- interpretación ampliada;
- contexto astrológico relevante;
- explicación de los factores utilizados;
- posibilidad de continuar preguntando;
- conversación personalizada a partir de la información que ya has compartido.

## Precio

# 9,99 €

**Pago único previsto para esta experiencia.**

### Aviso obligatorio visible antes del CTA

> Vega está actualmente en beta cerrada. Hoy no se realizará ningún cargo ni te pediremos datos de tarjeta.

### CTA

# Quiero acceso por 9,99 €

Evento al visualizar:

`paywall_view`

Evento CTA:

`priced_cta_click`

---

# O. PRICED ACCESS INTENT

Después del clic:

### Título

# Solicitar acceso anticipado

### Texto

El precio previsto para esta experiencia es **9,99 €**.

Vega todavía está en beta cerrada y no estamos aceptando pagos.

Si quieres acceder cuando abramos las primeras plazas, continúa.

### CTA

**Sí, quiero acceso por 9,99 € cuando esté disponible**

Evento:

`priced_access_intent`

Éste es el evento principal de intención económica.

---

# P. WAITLIST

Después de `priced_access_intent`:

### Título

# Apúntate a la beta

### Texto

Déjanos tu email y te avisaremos cuando podamos ofrecerte acceso.

### Campo

Email.

### CTA

**Apuntarme**

Evento:

`waitlist_submit`

No interpretar este evento como venta.

---

# Q. CATÁLOGO DEFINITIVO DE EVENTOS

## Propiedades comunes

Todo evento debe intentar incluir:

```text
anonymous_user_id
session_id
experiment_id = vega_beachhead_v1
segment = A | B | null
trigger = value | null
partner_precision = full | partial | minimal | null
traffic_source
utm_source
utm_medium
utm_campaign
utm_content
placement
device_type
browser
country
timestamp
app_version

```

No incluir datos personales brutos.

---

## Eventos

| EventoSe dispara cuando     |                                                |
| --------------------------- | ---------------------------------------------- |
| `neutral_landing_view`      | carga válida de landing neutral                |
| `router_view`               | router visible                                 |
| `segment_selected`          | usuario elige A o B                            |
| `segment_entry`             | carga primer paso del segmento                 |
| `problem_selected`          | selecciona trigger                             |
| `problem_text_added`        | añade texto opcional                           |
| `problem_complete`          | supera bloque problema                         |
| `onboarding_start`          | inicia proceso posterior a selección           |
| `own_profile_start`         | llega a explicación de datos propios           |
| `birth_date_added`          | fecha válida                                   |
| `birth_time_added`          | hora válida                                    |
| `birth_time_unknown`        | declara desconocida                            |
| `birth_place_added`         | lugar válido                                   |
| `own_profile_complete`      | perfil propio suficiente                       |
| `partner_data_start`        | B inicia datos de segunda persona              |
| `partner_full_data`         | datos completos válidos                        |
| `partner_partial_data`      | fecha + lugar, sin hora                        |
| `partner_minimal_data`      | fecha únicamente                               |
| `partner_analysis_possible` | motor determina análisis viable                |
| `onboarding_complete`       | todos los requisitos del segmento cumplidos    |
| `preview_generation_start`  | comienza generación                            |
| `preview_generation_error`  | generación no válida                           |
| `preview_view`              | preview visible                                |
| `preview_completion`        | preview consumida / CTA final                  |
| `paywall_view`              | precio visible                                 |
| `priced_cta_click`          | clic CTA 9,99 €                                |
| `priced_access_intent`      | confirma voluntad de acceso al precio mostrado |
| `waitlist_submit`           | email válido enviado                           |

---

# R. EVENTOS DERIVADOS

No es necesario dispararlos; pueden calcularse.

```text
qualified_segment_entry
own_profile_completion
partner_completion
preview_success
priced_intent

```

---

# S. MÉTRICAS PRINCIPALES

## 1. Demanda natural

```text
segment_selected_A / router_view
segment_selected_B / router_view

```

Interpretación:

distribución de necesidades dentro del tráfico adquirido.

No significa intención de compra.

---

## 2. Commitment comparable

```text
own_profile_complete / segment_entry

```

Debe compararse A vs B.

Es el último punto razonablemente comparable antes de que B introduzca fricción de segunda persona.

Interpretación:

confianza + relevancia + voluntad de proporcionar datos propios.

---

## 3. Monetización downstream

```text
priced_access_intent / paywall_view

```

Interpretación:

entre usuarios que ya recibieron suficiente experiencia para alcanzar el precio, qué porcentaje declara una acción económica explícita frente a 9,99 €.

No equivale a compra real.

---

## 4. Monetización end-to-end

```text
priced_access_intent / segment_entry

```

Ésta es la métrica comercial central de la fase.

Incorpora:

- fricción;
- onboarding;
- calidad preview;
- precio.

Permite evitar falsos positivos derivados de funnels que filtran demasiado antes del paywall.

---

## 5. Guardrail

```text
onboarding_complete / onboarding_start

```

Interpretación:

si una propuesta monetiza sólo después de expulsar a gran parte de los usuarios.

---

## 6. B estructural

```text
partner_analysis_possible / partner_data_start

```

Interpretación:

qué proporción de usuarios B puede aportar suficiente información para producir un análisis.

Breakdown:

```text
partner_precision = full
partner_precision = partial
partner_precision = minimal

```

---

# T. MÉTRICAS DIAGNÓSTICAS

Calcular también:

```text
problem_complete / segment_entry

own_profile_start / problem_complete

birth_date_added / own_profile_start

birth_time_unknown / birth_date_added

own_profile_complete / own_profile_start

preview_view / onboarding_complete

preview_completion / preview_view

paywall_view / preview_view

priced_cta_click / paywall_view

priced_access_intent / priced_cta_click

waitlist_submit / priced_access_intent

```

Además:

- error rate;
- preview generation latency;
- funnel duration;
- partner precision mix;
- device breakdown;
- placement breakdown;
- source breakdown.

---

# U. DASHBOARD POSTHOG

## Dashboard 1 — Executive Validation

### Tarjetas

1. Neutral landing views
2. Router views
3. Segment A selections
4. Segment B selections
5. A end-to-end priced intent
6. B end-to-end priced intent
7. A downstream priced intent
8. B downstream priced intent
9. A onboarding completion
10. B onboarding completion

---

## Dashboard 2 — Full Funnel A

```text
segment_entry A
→ problem_complete
→ own_profile_complete
→ onboarding_complete
→ preview_view
→ preview_completion
→ paywall_view
→ priced_cta_click
→ priced_access_intent
→ waitlist_submit

```

Mostrar:

- volumen;
- conversión entre pasos;
- drop-off.

---

## Dashboard 3 — Full Funnel B

```text
segment_entry B
→ problem_complete
→ own_profile_complete
→ partner_data_start
→ partner_analysis_possible
→ onboarding_complete
→ preview_view
→ preview_completion
→ paywall_view
→ priced_cta_click
→ priced_access_intent
→ waitlist_submit

```

Breakdown:

`partner_precision`.

---

## Dashboard 4 — A vs B

Tabla:

| MétricaABDiferencia absolutaDiferencia relativa |
| ----------------------------------------------- |

Métricas:

- selection;
- own profile;
- onboarding;
- preview;
- downstream intent;
- end-to-end intent;
- waitlist.

---

## Dashboard 5 — Acquisition Quality

Breakdowns:

- placement;
- device;
- campaign;
- UTM;
- browser;
- day;
- hour.

Objetivo:

detectar si A/B están recibiendo composiciones de tráfico muy diferentes.

---

## Dashboard 6 — Technical Health

Métricas:

- `preview_generation_error`;
- error por tipo;
- latency p50/p95;
- geocoding failures;
- duplicate events;
- event delivery;
- frontend exceptions.

---

## Cohortes

Crear:

`Segment A`

`Segment B`

`A priced intent`

`B priced intent`

`B full precision`

`B partial precision`

`B minimal precision`

`Preview error users`

`Test/internal traffic`

---

# V. SUPABASE — MODELO MÍNIMO

## Tabla `experiment_users`

```text
id UUID
created_at
segment
traffic_source
utm_source
utm_medium
utm_campaign
utm_content
placement
device

```

---

## Tabla `problem_context`

```text
id
user_id
segment
trigger
free_text_encrypted
created_at

```

El texto se guarda separado del analytics.

---

## Tabla `user_birth_profile`

```text
user_id
birth_date
birth_time
birth_time_known
birth_place
latitude
longitude
timezone
created_at

```

Acceso restringido.

---

## Tabla temporal `partner_input`

Sólo B.

```text
session_id
partner_birth_date
partner_birth_time
partner_birth_time_known
partner_birth_place
created_at
expires_at

```

Debe ser temporal.

---

## Tabla `partner_derived_profile`

Sólo si realmente resulta necesario conservar derivados.

```text
session_id
partner_precision
derived_features_json
created_at
expires_at

```

No nombre.

No email.

No identificadores.

---

## Tabla `preview`

```text
id
user_id
segment
partner_precision
schema_version
model_version
preview_json
qa_status
created_at

```

---

## Tabla `waitlist`

```text
user_id
email
consent_version
created_at

```

Mantener email separado del resto de analytics.

---

# W. PRIVACIDAD

## Guardar en Supabase

Datos necesarios para:

- cálculo;
- funcionamiento del experimento;
- generación de preview;
- contacto beta cuando sea solicitado.

Incluye:

- fecha;
- hora;
- lugar;
- trigger;
- texto opcional;
- email sólo si llega a waitlist.

---

## NO enviar a PostHog

- fecha exacta;
- hora exacta;
- ciudad;
- coordenadas;
- texto emocional;
- email;
- datos de segunda persona;
- outputs astrológicos identificables.

PostHog sólo recibe flags y categorías.

---

## Datos de segunda persona

No solicitar:

- nombre;
- apellido;
- email;
- teléfono;
- dirección;
- cuenta social.

### Retención recomendada para experimento

Los datos brutos de segunda persona deben eliminarse automáticamente en cuanto:

1. se haya calculado la información necesaria;
2. se haya verificado que la generación de preview ha terminado correctamente;
3. haya expirado una ventana técnica mínima para reintento.

Como especificación técnica:

### `partner_input.expires_at`

**Implementado y verificado.** Eliminación inmediata tras cálculo
correcto (en el propio flujo de servidor), y como máximo **24 horas**
mediante un job de `pg_cron` horario (`purge-partner-input-expired`),
configurado manualmente en Supabase. Ver
`VEGA_Plan_Tecnico_Implementacion_Experimento.md`, sección 11, para el
detalle técnico verificado.

Antes de producción comercial, revisar jurídicamente este tratamiento.

---

## Texto emocional

Definir una política de conservación explícita.

**Implementado y verificado.** El texto libre (`problem_context.free_text`)
se elimina automáticamente **30 días después de su propia creación**
(columna `delete_after`), de forma continua — no depende de cuándo
termine la recogida de tráfico del experimento. Ver
`VEGA_Plan_Tecnico_Implementacion_Experimento.md`, sección 11, para el
detalle técnico verificado (migración, función de purga y cron).

---

# X. AVISO ANTES DEL FORMULARIO

Antes de `own_profile_start`:

> **Cómo utilizaremos tus datos**
>
> Utilizaremos los datos que proporciones para calcular la información astrológica necesaria y generar esta experiencia de prueba.
>
> No necesitas proporcionar tu nombre completo.
>
> Puedes abandonar el proceso en cualquier momento.
>
> Consulta la Política de Privacidad para conocer cómo almacenamos, protegemos y eliminamos los datos.

Checkbox cuando sea jurídicamente necesario según base de tratamiento elegida.

No usar consentimiento genérico para finalidades adicionales.

Separar cualquier consentimiento futuro de marketing.

---

# Y. META ADS — SETUP

## Campaña

Nombre:

`VEGA_BEACHHEAD_V1_ES`

## Objetivo

Tráfico.

Optimización:

**Landing Page Views.**

---

## Ad Set

Nombre:

`ES_18PLUS_NEUTRAL_V1`

### Ubicación

España.

### Edad

18+.

### Sexo

Todos.

No segmentar por sexo en el primer experimento.

---

## Audiencia

Mantener amplia pero relevante.

Evitar microsegmentaciones diferentes.

Una sola audiencia para ambos segmentos porque el router resuelve la selección posteriormente.

---

## Placements

Para máximo control inicial:

recomiendo limitar a un conjunto estable:

- Instagram Feed;
- Instagram Stories;
- Instagram Reels;
- Facebook Feed.

Evitar ampliar automáticamente a placements completamente distintos durante la primera lectura si impide interpretar calidad.

Registrar siempre `placement`.

---

## Exclusiones

- tráfico interno;
- empleados/testers;
- usuarios de QA;
- retargeting;
- visitantes previos si pueden contaminar exposición;
- audiencias propias del desarrollo.

---

## Dynamic Creative

OFF.

---

## Creative

Uno único.

### Texto

**¿Hay algo importante que no terminas de entender?**

Explora una situación de tu vida desde una perspectiva personalizada basada en tu carta natal.

### CTA

**Más información**

No mencionar A/B.

---

## UTM

```text
utm_source=meta
utm_medium=paid_social
utm_campaign=vega_beachhead_v1_es
utm_content=neutral_v1

```

Añadir macro/param para placement cuando sea posible.

---

# Z. PRESUPUESTO DE PRUEBA

Presupuesto total máximo inicial:

**500 €**

No debe obligatoriamente gastarse completo.

Objetivo aproximado:

**400–600 entradas válidas al router**, intentando conseguir suficientes usuarios reales en A y B para poder evaluar diferencias grandes.

Como la auto-selección puede no ser 50/50, no existe garantía de 300 usuarios por segmento.

Ejemplo:

600 router views:

A = 390

B = 210.

Eso es información útil en sí misma.

---

# AA. CRITERIO DE MUESTRA

No sacar conclusiones por:

- primeras 20 conversiones;
- primeras 24 horas;
- diferencia temporal inicial.

Duración mínima sugerida:

**7 días completos.**

Antes de declarar señal fuerte:

idealmente tener al menos aproximadamente:

**150 segment entries** en cada segmento.

Si uno no alcanza 150 porque casi nadie lo elige, esa baja incidencia forma parte del resultado.

---

# AB. STOP / GO

## STOP GENERAL

Revisar antes de Concierge si:

```text
priced_access_intent / segment_entry < 3%

```

en A y B,

y además ambos presentan:

bajo completion;

bajo preview→paywall;

sin problemas técnicos que lo expliquen.

---

## SEÑAL DÉBIL

End-to-end:

3–5%.

Continuar sólo si otros indicadores son positivos.

---

## SEÑAL INTERESANTE

End-to-end:

5–10%.

Candidato claro a Concierge.

---

## SEÑAL FUERTE

End-to-end:

> 10%.

No significa product-market fit.

Sí justifica invertir en la siguiente validación.

---

# AC. COMPARACIÓN A/B

No declarar ganador usando únicamente downstream.

Evaluar simultáneamente:

### Demanda

`segment_selected / router_view`

### Commitment

`own_profile_complete / segment_entry`

### End-to-end

`priced_access_intent / segment_entry`

### Downstream

`priced_access_intent / paywall_view`

### Guardrail

`onboarding_complete / onboarding_start`

---

# AD. DECISIONES POSIBLES

## GO A

A presenta mejor señal end-to-end y no existe explicación obvia de UX/calidad que invalide la comparación.

---

## GO B

B presenta mejor señal end-to-end y la ventaja persiste incluso incorporando la fricción de segunda persona.

---

## GO A + B

Uno gana downstream y otro end-to-end/commitment de forma relevante.

Pasar ambos a Concierge.

---

## NO-GO

Ambos débiles después de eliminar:

- errores;
- mala calidad de preview;
- tráfico irrelevante;
- tracking defectuoso.

---

# AE. QA DE ANALYTICS

Antes del tráfico real, ejecutar manualmente estos journeys:

### Journey A completo

A → texto → hora conocida → preview → priced intent → waitlist.

### Journey A sin hora

A → no hora → preview.

### B full

B → partner full → preview.

### B partial

B → partner sin hora.

### B minimal

B → sólo fecha.

### B no viable

Debe bloquear correctamente sin inventar output.

### Preview error

Forzar fallo API.

### Usuario que abandona

Comprobar que no se crean eventos falsos de completion.

---

# AF. BOTS Y TESTERS

Todos los testers deben llevar:

```text
traffic_source = internal
is_test = true

```

Excluirlos de todos los dashboards.

Filtrar:

- IP interna si procede;
- parámetros `?test=1`;
- usuarios QA;
- Playwright/Cypress;
- health checks.

---

# AG. CHECKLIST FINAL GO / NO-GO

## Router

-  Landing neutral publicada.
-  Router muestra sólo A/B para la muestra principal.
-  Segment selection registra correctamente.
-  No existe asignación automática A/B.
-  Los usuarios out-of-scope quedan excluidos.

## Flujo A

-  Problema antes de datos.
-  Texto opcional.
-  Hora desconocida soportada.
-  Lugar validado.
-  Preview funciona.
-  Paywall funciona.

## Flujo B

-  Problema antes de datos.
-  Datos propios separados de datos partner.
-  Full soportado.
-  Partial soportado.
-  Minimal sólo habilitado si el motor lo permite.
-  `partner_precision` correcto.
-  B nunca inventa casas/Ascendente sin hora.

## Preview

-  Schema fijo.
-  Dos evidencias exactas.
-  Evidencias vienen del motor.
-  20 QA A.
-  20 QA B.
-  Media ≥4/5.
-  Diferencia A/B ≤0,25.
-  Cero alucinaciones astrológicas factuales.
-  Seguridad aprobada.

## Fake door

-  Precio 9,99 € visible.
-  Beta cerrada visible antes de CTA.
-  No se solicita tarjeta.
-  `priced_cta_click` correcto.
-  `priced_access_intent` correcto.
-  Waitlist posterior.

## Analytics

-  Todos los eventos probados.
-  Event names congelados antes del lanzamiento.
-  Propiedades comunes presentes.
-  Texto personal fuera de PostHog.
-  Datos brutos fuera de PostHog.
-  `segment_entry` funciona.
-  `own_profile_complete` funciona.
-  `partner_analysis_possible` funciona.
-  `preview_generation_error` funciona.
-  End-to-end funnel validado.

## Dashboard

-  Executive dashboard.
-  Funnel A.
-  Funnel B.
-  A/B comparison.
-  Acquisition quality.
-  Technical health.
-  Test traffic excluido.

## Supabase

-  RLS configurado.
-  Datos personales protegidos.
-  Email separado.
-  Partner raw data temporal.
-  Proceso automático de eliminación — **completado** (ver
   `VEGA_Plan_Tecnico_Implementacion_Experimento.md`, sección 11).
-  Política de retención implementada — **completado** (ver
   `VEGA_Plan_Tecnico_Implementacion_Experimento.md`, sección 11, y
   `VEGA_Politica_Privacidad_Beta_v1.md`, sección 5).

## Privacidad

-  Aviso de privacidad revisado.
-  Finalidades documentadas.
-  Datos minimizados.
-  Tratamiento de tercera persona revisado.
-  Política de eliminación documentada.
-  Marketing separado de uso experimental.

## Meta

-  Campaña única.
-  España.
-  18+.
-  Un ad set.
-  Un creative.
-  Dynamic creative OFF.
-  Retargeting OFF.
-  Optimización a Landing Page View.
-  UTMs verificadas.
-  Placement registrado.

## Técnico

-  Mobile first.
-  Latencia preview aceptable.
-  Retry implementado.
-  Errores del motor registrados.
-  Duplicados de eventos controlados.
-  Backups/configuración disponibles.

---

# AH. DEFINICIÓN DE “LISTO PARA LANZAR”

El experimento sólo recibe **GO** cuando se cumplen simultáneamente cuatro condiciones:

### 1. Calidad

A y B producen previews comparables y técnicamente correctas.

### 2. Medición

Cada paso del funnel puede observarse sin ambigüedad.

### 3. Privacidad

No recopilamos datos que no necesitemos y los datos de tercera persona tienen tratamiento temporal explícito.

### 4. Transparencia comercial

El usuario ve el precio y sabe, antes de expresar intención, que todavía no se le cobrará.

---

# AI. PRINCIPIO FINAL DE INTERPRETACIÓN

Al terminar el experimento nunca utilizaremos:

> “B consiguió más intención después del paywall.”

de manera aislada.

La comparación empresarial será:

```text
DEMANDA NATURAL
       ↓
COMMITMENT
       ↓
FRICCIÓN REAL DEL PRODUCTO
       ↓
PREVIEW
       ↓
PRICE INTENT
       ↓
END-TO-END CONVERSION

```

La métrica central del experimento es:

# `priced_access_intent / segment_entry`

y se interpretará siempre junto a:

```text
segment_selected / router_view
own_profile_complete / segment_entry
onboarding_complete / onboarding_start
priced_access_intent / paywall_view
partner_analysis_possible / partner_data_start

```

El experimento estará correctamente implementado cuando cualquier diferencia entre A y B pueda atribuirse razonablemente a **demanda + fricción real de cada propuesta**, y no a errores de tracking, previews de distinta calidad, UX desigual o tráfico distinto.