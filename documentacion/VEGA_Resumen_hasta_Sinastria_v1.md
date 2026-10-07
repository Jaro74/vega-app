# VEGA — Resumen de implementación hasta Sinastría v1

## 1. Estado general del proyecto

El experimento de validación de Vega queda actualmente en este estado:

- **Sprint 1 — Datos, sesión y analytics base:** cerrado.
- **Sprint 2 — Router + onboarding A/B:** cerrado.
- **Sprint 3A — Evidencia natal + preview con OpenAI para segmento A:** cerrado.
- **Sprint 3B — Sinastría / segmento B:** motor y API de sinastría terminados; pendiente integración en Next.js + preview B.
- **Sprint 4 — Paywall + intención de pago + waitlist:** pendiente.

La arquitectura general sigue separada por responsabilidades:

```text
Usuario
  ↓
Next.js / experimento Vega
  ↓
Supabase → estado y persistencia
  ↓
Vega API Railway → cálculo y evidencia astrológica autorizada
  ↓
OpenAI → interpretación de evidencia autorizada
  ↓
PostHog EU → analytics y funnels
```

Regla principal:

> **Vega calcula y autoriza la evidencia astrológica. OpenAI interpreta. Next.js orquesta, valida, persiste y mide.**

---

# 2. Estado previo consolidado

## Sprint 1

Implementado y validado:

- identidad anónima;
- sesiones e intentos;
- persistencia Supabase;
- RLS;
- router A/B;
- PostHog EU;
- UTMs;
- modo de test.

Estado: **CERRADO**.

## Sprint 2

Implementado y validado:

- onboarding A;
- onboarding B;
- datos propios;
- datos de la otra persona;
- partner `full`, `partial`, `minimal`;
- geocoding local con GeoNames;
- persistencia;
- eventos;
- refresh/resume;
- idempotencia;
- privacidad.

Regla importante:

> **Nunca se inventa una hora de nacimiento.**

Estado: **CERRADO**.

## Sprint 3A

Implementado y validado:

```text
birth_data
→ Vega API
→ /evidence/natal
→ allowed_evidence
→ OpenAI Structured Outputs
→ validación post-generación
→ preview A
→ Supabase
→ PostHog
```

Contrato natal estable:

```text
POST /evidence/natal
```

Auth server-to-server:

```text
X-Internal-Evidence-Token
```

Versiones:

```text
facts_v1
claims_v1
evidence_v1
```

La preview A ya funciona con infraestructura real.

Estado: **CERRADO**.

---

# 3. Objetivo de la sinastría

El objetivo fue completar el brazo B del experimento con una sinastría real, no una interpretación genérica de dos cartas.

La sinastría v1 quedó definida como:

> **Aspectos astrológicos entre cuerpos de la carta A y cuerpos de la carta B, calculados con las mismas reglas de aspecto y orbe que Vega ya usa en natal.**

No se implementó:

- composite chart;
- Davison;
- progresiones;
- tránsitos de pareja;
- scores de compatibilidad;
- house overlays;
- themes relacionales;
- predicciones;
- claims tipo “soulmate”.

Esto se dejó deliberadamente fuera de v1.

---

# 4. Fase 24.1 — Diseño semántico de sinastría v1

Se auditó qué podía reutilizarse del motor natal.

## Reutilizado

- `normalize_birth_data`
- `chart_fingerprint`
- `engine.build_chart`
- posiciones planetarias
- ASC/MC cuando hay hora
- `engine.ASPECTS`
- reglas de orbe
- patrón de versionado
- patrón de EvidenceItem

## No reutilizado directamente

- `claims.autogen_structural`
- `claims.validate_structural`
- `relational_claims_builder`

La razón es que todos ellos trabajan dentro de una sola carta.

El llamado `relational_claims_builder` no era sinastría: relaciona configuraciones dentro de la misma carta.

## Sinastría v1 congelada

Cuerpos:

```text
sun
moon
mercury
venus
mars
jupiter
saturn
uranus
neptune
pluto
north_node
lilith_mean
```

Además:

```text
asc
mc
```

solo si esa persona tiene hora conocida.

Aspectos:

```text
conjuncion
sextil
cuadratura
trigono
oposicion
```

Mismos orbes que el motor natal.

---

# 5. Roles A/B y direccionalidad

Los roles del request son semánticos.

```text
birth_data_a → persona A
birth_data_b → persona B
```

Ejemplo:

```text
Venus_A trígono Mars_B
```

es un único hecho.

No se ordenan alfabéticamente `body_a` y `body_b`.

Subject elegido:

```json
{
  "person_a_body": "venus",
  "person_b_body": "mars"
}
```

Esto evita perder qué cuerpo pertenece a cada persona.

---

# 6. Fase 24.1.1 — Hora desconocida y versionado

Se corrigieron dos supuestos importantes.

## `chart_id` no contiene versiones

`chart_id` es únicamente fingerprint de los datos de nacimiento normalizados.

No contiene:

- versión del motor;
- versión de FACTS;
- versión de CLAIMS.

Por tanto la evidencia de sinastría necesita versionado explícito.

## Minimal

El onboarding permite:

```text
full    = fecha + hora + lugar
partial = fecha + lugar, sin hora
minimal = fecha únicamente
```

Pero el motor necesita timezone + coordenadas para convertir una fecha local a un instante UTC.

Decisión:

```text
FULL    → soportado
PARTIAL → soportado
MINIMAL → insufficient_data en v1
```

Nunca se inventa:

- timezone;
- lugar;
- lat/lon;
- hora.

---

# 7. Fase 24.1.2 — Robustez por aspecto

Se detectó que excluir únicamente la Luna cuando falta la hora no era suficiente.

El problema real no es “qué planeta se mueve mucho”, sino si un aspecto concreto sigue existiendo durante toda la ventana de incertidumbre.

## Fórmula final

Para cada aspecto candidato:

```text
δ_A = incertidumbre máxima del body A si A es partial, si no 0
δ_B = incertidumbre máxima del body B si B es partial, si no 0

δ_total = δ_A + δ_B

robusto ⇔ orb_nominal + δ_total ≤ allow
```

Solo un aspecto robusto puede convertirse en `allowed_evidence`.

Si ambos son `partial`:

```text
δ_total = δ_A + δ_B
```

sin asumir cancelaciones.

## Cálculo de incertidumbre

No se usa una tabla estática histórica.

Se calcula dinámicamente por request sobre el día civil real de la persona:

- muestreo determinista;
- funciones reales del motor;
- timezone real;
- manejo de DST;
- margen de discretización `×1.1`.

## Precisión del payload

Cuando ambos participantes del aspecto son `full`:

```text
orbe
fuerza
exacto
```

pueden conservarse.

Cuando interviene al menos un `partial`:

```text
orbe   → omitido
fuerza → omitido
exacto → omitido
```

No se presenta falsa precisión.

---

# 8. Versionado final de sinastría

Versiones propias:

```text
SYNASTRY_FACTS_VERSION = "syn_facts_v1"
SYNASTRY_CLAIMS_VERSION = "syn_claims_v1"
SYNASTRY_EVIDENCE_SCHEMA_VERSION = "syn_evidence_v1"
```

Además se reutiliza:

```text
FACTS_VERSION = "facts_v1"
```

No se incluye `CLAIMS_VERSION` natal porque la sinastría no depende de `claims.py` natal.

Formato de evidence ID:

```text
{syn_evidence_schema_version}:
{syn_facts_version}:
{syn_claims_version}:
{facts_version}:
{chart_id_a}:
{chart_id_b}:
{canonical_key}
```

Canonical key:

```text
inter_aspect:{person_a_body}:{person_b_body}:{aspect_type}
```

---

# 9. Fase 24.2 — Motor local de sinastría

Commit:

```text
557ac18
```

Archivos creados:

```text
sonda/synastry_constants.py
sonda/synastry_facts.py
sonda/synastry_claims.py
sonda/synastry_evidence.py
sonda/synastry_engine.py
sonda/test_synastry.py
```

Pipeline:

```text
birth_data A + birth_data B
→ build_synastry_facts
→ autogen_synastry_structural
→ build_synastry_evidence_items
```

No utiliza:

- OpenAI;
- themes;
- shadow;
- `relational_claims_builder`;
- `facts.build_facts`;
- EvidenceItem natal.

## `SynastryFacts`

Contiene:

```text
status
chart_id_a
chart_id_b
time_known_a
time_known_b
precision_a
precision_b
inter_chart_aspects[]
not_robust_count
```

## `SynastryClaim`

Kind inicial único:

```text
inter_chart_aspect
```

Forma:

```text
id
kind
subject
asserted
validation
```

## `SynastryEvidenceItem`

Campos:

```text
id
syn_evidence_schema_version
syn_facts_version
syn_claims_version
facts_version
chart_id_a
chart_id_b
kind
subject
payload
provenance
label
```

Tests:

```text
33/33 PASS
```

Toda la regresión natal/F19-F23 siguió en verde.

---

# 10. Fase 24.3 — Endpoint HTTP local

Commit:

```text
732e289
```

Endpoint nuevo:

```text
POST /evidence/synastry
```

Request:

```json
{
  "request_id": "opcional",
  "birth_data_a": {},
  "birth_data_b": {}
}
```

Auth:

```text
X-Internal-Evidence-Token
```

reutilizando:

```text
SONDA19_INTERNAL_EVIDENCE_TOKEN
```

## Response OK

```json
{
  "request_id": "...",
  "status": "ok",
  "chart_id_a": "PROD_...",
  "chart_id_b": "PROD_...",
  "versions": {
    "facts": "facts_v1",
    "synastry_facts": "syn_facts_v1",
    "synastry_claims": "syn_claims_v1",
    "synastry_evidence_schema": "syn_evidence_v1"
  },
  "time_context": {
    "time_known_a": true,
    "time_known_b": false
  },
  "precision": {
    "a": "full",
    "b": "partial"
  },
  "allowed_evidence": []
}
```

## Response minimal

```json
{
  "request_id": "...",
  "status": "insufficient_data",
  "insufficient_participants": ["b"]
}
```

No devuelve:

- birth data;
- lugares;
- coordenadas;
- timezone;
- hora;
- deltas;
- diagnostics;
- validation internals;
- estado OpenAI;
- estado shadow.

---

# 11. Bugs reales descubiertos en 24.3

## Bug A — deadlock del harness de tests

El test runner arrancaba uvicorn con:

```text
stdout=subprocess.PIPE
```

sin drenar el pipe concurrentemente.

En Windows terminó bloqueando todo el servidor:

- `/health` no respondía;
- incluso un 404 de auth se quedaba colgado;
- CPU prácticamente cero.

Fix:

- stdout/stderr redirigidos a archivo real;
- cleanup garantizado;
- test específico con 80 requests seguidas.

No era un bug del motor de sinastría.

## Bug B — `numpy.bool_`

En `synastry_facts.py`:

```python
orb < 0.1667
```

producía `numpy.bool_`.

FastAPI no podía serializarlo correctamente.

Fix:

```python
bool(orb < 0.1667)
```

No cambió la semántica, solo normalizó el tipo Python.

Tests HTTP:

```text
40/40 PASS
```

Regresión completa:

```text
PASS
```

---

# 12. Fase 24.4 — Railway + smoke test remoto

Deployment:

```text
commit: 732e289
deployment: 804cc466-5c0b-405a-89df-2bfad4e2873c
status: Online
```

Servicio:

```text
https://vega-api-production-842b.up.railway.app
```

## Health

```text
/health → 200 ok
/ready  → 200 ready
```

## Auth negativa

```text
POST /evidence/synastry
sin token
→ 404
```

## Full / Full

Resultado:

```text
HTTP 200
status = ok
precision = full/full
allowed_evidence = 55
```

Los 55 items conservaban:

```text
orbe
fuerza
exacto
```

## Full / Partial

Resultado:

```text
HTTP 200
status = ok
precision = full/partial
allowed_evidence = 40
```

Reglas confirmadas:

- sin ASC/MC de B;
- IDs únicos;
- orden determinista;
- `orbe` ausente;
- `fuerza` ausente;
- `exacto` ausente.

## Partial / Partial

Resultado:

```text
HTTP 200
status = ok
precision = partial/partial
allowed_evidence = 28
```

Confirmado:

- cero ASC/MC;
- solo aspectos robustos;
- sin `orbe`;
- sin `fuerza`;
- sin `exacto`.

## Minimal

Resultado:

```json
{
  "status": "insufficient_data",
  "insufficient_participants": ["b"],
  "request_id": "..."
}
```

No se intenta producir una sinastría falsa o aproximada.

## Shadow / OpenAI / SQLite

Antes y después:

```text
jobs: 1 → 1
```

Cero jobs nuevos.

También:

- cero tracebacks;
- cero HTTP 500;
- cero errores SQLite;
- cero OpenAI;
- cero shadow enqueue;
- cero flags tocadas.

Estado:

> **FASE 24.4 — PASS**

---

# 13. Estado actual de la sinastría

La sinastría v1 está terminada como motor de evidencia para el experimento.

```text
24.1    Diseño semántico                    ✅ CLOSED
24.1.1  Hora desconocida + versionado       ✅ CLOSED
24.1.2  Robustez por aspecto                ✅ CLOSED
24.2    Motor SynastryFacts/Claims/Evidence ✅ CLOSED
24.3    POST /evidence/synastry             ✅ CLOSED
24.4    Railway + smoke remoto              ✅ PASS
```

Esto no significa que estén implementadas todas las técnicas astrológicas de relaciones posibles.

Lo que está completo es la primera versión necesaria para Sprint 3B.

---

# 14. Sprint 3B — siguiente integración

Ahora el brazo B puede pasar de:

```text
onboarding B
→ partner data
→ 409 not_available
```

a:

```text
onboarding B
→ partner data
→ /evidence/synastry
→ allowed_evidence
→ OpenAI Structured Outputs
→ validación post-generación
→ preview B
→ persistencia
→ analytics
```

Regla importante:

> Si Vega devuelve `insufficient_data`, Next.js no debe inventar ni simular una preview.

Sprint 3B queda técnicamente desbloqueado.

---

# 15. Después de Preview A + Preview B

Cuando ambos brazos estén terminados:

```text
A → preview natal real
B → preview relacional real
        ↓
Sprint 4
        ↓
paywall
CTA 9,99 €
priced_access_intent
waitlist
```

El objetivo entonces será validar monetización y comportamiento real del funnel.

---

# 16. Hipótesis futura de adquisición — Carta natal gratuita

Se ha identificado una posible vía adicional de adquisición, pero **no se implementa ahora**.

Idea:

```text
Carta natal gratis
→ resultado básico útil
→ invitación a explorar una situación concreta
→ Preview A o B
→ oferta
```

La carta natal gratuita no sustituiría el producto principal.

Su función sería:

- atraer tráfico;
- facilitar entrada desde redes;
- facilitar entrada desde SEO;
- permitir que usuarios con intención astrológica conozcan Vega;
- conducirlos hacia una interpretación personalizada.

Separación conceptual:

```text
GRATIS
→ carta natal / posiciones principales

PREVIEW
→ interpretación personalizada ligada a una situación

PAGO
→ lectura o experiencia más completa
```

Posibles vías de entrada futuras:

```text
VÍA 1
Carta natal gratis
→ Vega

VÍA 2
Contenido / redes / ads
→ problema concreto
→ A o B

VÍA 3
SEO astrológico
→ carta natal
→ Vega
```

Esta idea queda anotada como:

> **HIPÓTESIS FUTURA DE ADQUISICIÓN**

No modifica el roadmap inmediato.

---

# 17. Roadmap inmediato

Orden actual:

```text
1. Terminar Sprint 3B en Next.js
2. Validar Preview B real
3. Cerrar Sprint 3B
4. Implementar Sprint 4
5. Lanzar experimento A/B
6. Medir comportamiento real
7. Decidir siguientes ampliaciones según datos
```

No se amplía ahora el motor de sinastría con:

- house overlays;
- composite;
- Davison;
- scores;
- más técnicas avanzadas.

Esas decisiones se tomarán después de tener señales reales del experimento.

---

# 18. Estado resumido

```text
Sprint 1   ✅ cerrado
Sprint 2   ✅ cerrado
Sprint 3A  ✅ cerrado
Sinastría  ✅ motor + API cerrados y validados
Sprint 3B  ⏳ integración Next.js + Preview B pendiente
Sprint 4   ⏳ pendiente
```

Principio que se mantiene:

> **No construir más producto del necesario antes de validar que el usuario lo quiere.**
