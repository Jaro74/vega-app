# VEGA — PLAN TÉCNICO DE IMPLEMENTACIÓN DEL EXPERIMENTO

## 0. Principios técnicos

Este MVP debe cumplir cinco reglas:

1. **No construir arquitectura del producto final.**
2. **El navegador nunca accede directamente a secretos, OpenAI ni tablas sensibles.**
3. **El motor Vega es la única autoridad para cálculos astrológicos.**
4. **PostHog nunca recibe datos personales brutos.**
5. **Un fallo de analytics, n8n o email no puede impedir que avance el experimento.**

Next.js App Router permite combinar frontend y lógica backend mediante la misma aplicación, evitando crear un backend independiente para este MVP.

---

# 1. ARQUITECTURA MÍNIMA

```text
┌──────────────────────┐
│      Navegador       │
│ Next.js / React UI   │
└──────────┬───────────┘
           │ HTTPS
           ▼
┌──────────────────────┐
│    Next.js App       │
│                      │
│ Pages                │
│ Route Handlers       │
│ Validation           │
│ Experiment logic     │
└───────┬──────┬───────┘
        │      │
        │      ├──────────────────────► PostHog EU
        │      │                        eventos pseudónimos
        │
        ▼
┌──────────────────────┐
│      Supabase        │
│ Postgres + RLS       │
│ Datos experimento    │
│ Datos personales     │
└──────────┬───────────┘
           │
           │ datos validados
           ▼
┌──────────────────────┐
│   API MOTOR VEGA     │
│                      │
│ carta natal          │
│ casas                │
│ aspectos             │
│ tránsitos            │
│ sinastría            │
└──────────┬───────────┘
           │
           │ allowed_evidence
           ▼
┌──────────────────────┐
│     OpenAI API       │
│ Responses API        │
│ Structured Outputs   │
└──────────┬───────────┘
           │
           │ preview_v1 JSON
           ▼
┌──────────────────────┐
│ Validator + Safety   │
└──────────┬───────────┘
           │
           ▼
       PREVIEW

```

En paralelo:

```text
Browser / Next.js ───────────► PostHog EU

Supabase waitlist INSERT
        │
        ▼
 Database webhook
        │
        ▼
       n8n
        │
        ▼
 proveedor email

```

## Responsabilidades

### Navegador

Sólo:

- renderiza;
- captura formularios;
- realiza validación UX básica;
- mantiene estado temporal;
- envía eventos frontend no sensibles;
- llama a `/api/*`.

Nunca contiene:

- `SUPABASE_SERVICE_ROLE_KEY`;
- `OPENAI_API_KEY`;
- credenciales Vega;
- texto astrológico oculto;
- lógica crítica de validación.

---

## Next.js

Actúa como Backend for Frontend.

Responsable de:

- crear sesión experimental;
- validar todos los inputs;
- leer/escribir Supabase;
- llamar a Vega;
- construir `allowed_evidence`;
- llamar a OpenAI;
- validar `preview_v1`;
- registrar eventos backend;
- ejecutar fake door;
- guardar waitlist.

---

## Supabase

Sistema persistente de verdad para:

- usuario experimental;
- intento/flow;
- contexto;
- carta;
- datos temporales de partner;
- preview;
- priced intent;
- waitlist.

No se utiliza Supabase Auth en esta fase.

Todas las operaciones sensibles pasan por backend.

Las tablas deben llevar RLS y privilegios explícitos; Supabase advierte que RLS y grants deben configurarse conjuntamente y que `service_role` debe mantenerse exclusivamente en servidor.

---

## Motor Vega

Única fuente de verdad para:

- posiciones;
- Ascendente;
- MC;
- casas;
- aspectos;
- tránsitos;
- sinastría;
- precisión;
- factores válidos.

El LLM no recalcula absolutamente nada.

---

## OpenAI

Sólo:

> datos estructurados Vega → interpretación estructurada.

Utilizaremos Responses API + Structured Outputs con JSON Schema estricto. OpenAI recomienda `json_schema` sobre el antiguo JSON mode cuando el modelo lo soporta.

---

## PostHog

Sólo:

- eventos;
- funnels;
- cohortes;
- errores técnicos agregados;
- acquisition properties.

PostHog permite elegir infraestructura EU/Frankfurt y actualmente incluye hasta 1 millón de eventos de Product Analytics y 5.000 session replays mensuales en su capa gratuita.

### Estado real (verificado)

- Vega usa **PostHog Cloud EU** (`api_host` apunta a `eu.i.posthog.com`
  en `libs/analytics/posthog-client.ts`), no la variante US.
- **Session Replay está desactivado**: `posthog.init()` se llama con
  `disable_session_recording: true`, `autocapture: false` y
  `capture_pageview: false` — Vega solo dispara los eventos explícitos
  del catálogo congelado, nunca grabación de sesión ni autocaptura.
- Confirmado por código (no solo por diseño): PostHog nunca recibe
  email, fecha/hora/lugar de nacimiento, texto libre del usuario, ni
  identificadores de evidencia astrológica (`chart_id`, IDs de
  evidencia de sinastría) — `assertNoForbiddenProperties()`
  (`libs/analytics/events.ts`) lanza en tiempo de ejecución si cualquier
  propiedad coincide con esa lista prohibida, antes de que el evento
  pueda encolarse para enviarse.
- El `anonymous_user_id` generado y persistido en Supabase
  (`experiment_users.anonymous_user_id`) es exactamente el
  `distinct_id` que PostHog usa para identificar al visitante: no existe
  ningún mapping ni alias adicional. `ExperimentBootstrap` llama a
  `posthog.identify(anonymousUserId)` con ese mismo valor devuelto por
  `GET /api/session`, una única vez por carga de página.
- **Condición de carrera corregida.** Hasta esta revisión, varios
  eventos (`neutral_landing_view` en el landing, y cualquier evento
  disparado desde `/explorar` o `/flow`, que hacen su propia llamada a
  `/api/session` en paralelo) podían dispararse antes de que
  `ExperimentBootstrap` hubiera terminado su `identify()` asíncrono —
  quedando adjuntos al `distinct_id` anónimo interno de PostHog en vez
  del `anonymous_user_id` real, y por tanto fuera del alcance de
  cualquier purga futura basada en los IDs guardados en Supabase.
  Corregido mediante un gate centralizado en memoria
  (`libs/analytics/experiment-ready.ts`): ahora ningún evento del
  experimento se envía a PostHog hasta que, en este orden,
  `/api/session` responde correctamente, existe un `anonymousUserId`,
  `initPostHog()` devuelve una instancia válida y `posthog.identify(anonymousUserId)`
  se ha ejecutado. Si el bootstrap falla en cualquier punto (tráfico
  suspendido, fetch no-ok, PostHog no disponible, o una excepción), los
  eventos de esa visita se descartan en vez de enviarse sin identificar.
  El gate no introduce ningún mapping de identidad adicional ni ningún
  dato nuevo — es exclusivamente una señal en memoria (`pending` /
  `ready` / `blocked`) que no persiste ni viaja a ningún sitio.
- Esta corrección es la que permite que la estrategia de purga futura
  "exportar `anonymous_user_id` desde Supabase y borrar por `distinct_id`
  en PostHog" sea directamente aplicable: a partir de ahora, todo evento
  que llega a PostHog está asociado al `anonymous_user_id` real
  almacenado en Supabase, sin excepción.
- **Retención de eventos.** El plan Free de Product Analytics de
  PostHog retiene los eventos durante **12 meses**, según la
  documentación pública de PostHog. La llamada directa al endpoint
  `GET /api/projects/:id/events_retention/` del proyecto devolvió
  `retention_months: null` y `retained_from: null` — esto **no** se
  interpreta como retención ilimitada, sino como ausencia de una
  ventana específica configurada a nivel de proyecto (PostHog aplica en
  ese caso la retención por defecto de su plan).
- **Política operativa de retención de Vega para estos eventos:**
  conservarlos durante el experimento y su análisis posterior; un
  máximo de 12 meses, en línea con el plan actual; y posibilidad de
  purga manual anticipada al cierre del experimento, por `distinct_id`,
  una vez guardadas las métricas finales en otro sitio (mismo patrón ya
  aplicado a `priced_access_intents`, sección 11 de este documento).
- **Retención y trazabilidad técnica: cerradas.** Queda aparte, sin
  resolver todavía, el DPA específico de PostHog para la organización de
  Vega — pendiente como gestión operativa hasta que la identidad del
  responsable del tratamiento quede decidida (ver
  `VEGA_Politica_Privacidad_Beta_v1.md`, sección 7).

---

## n8n

Sólo procesos secundarios:

- email de confirmación;
- aviso interno;
- eventualmente limpieza/reports.

Nunca:

- cálculo astrológico;
- analytics crítico;
- persistencia principal.

---

# 2. REPOSITORIO NEXT.JS

Recomiendo un único repositorio:

```text
vega-experiment/
│
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   │
│   ├── explorar/
│   │   └── page.tsx
│   │
│   ├── flow/
│   │   ├── page.tsx
│   │   └── loading.tsx
│   │
│   ├── preview/
│   │   └── page.tsx
│   │
│   ├── access/
│   │   └── page.tsx
│   │
│   ├── beta/
│   │   └── page.tsx
│   │
│   └── api/
│       ├── session/
│       │   └── route.ts
│       ├── segment/
│       │   └── route.ts
│       ├── problem/
│       │   └── route.ts
│       ├── own-profile/
│       │   └── route.ts
│       ├── partner/
│       │   └── route.ts
│       ├── places/
│       │   └── route.ts
│       ├── preview/
│       │   └── route.ts
│       ├── priced-intent/
│       │   └── route.ts
│       └── waitlist/
│           └── route.ts
│
├── components/
│   ├── experiment/
│   │   ├── NeutralLanding.tsx
│   │   ├── SegmentRouter.tsx
│   │   ├── Progress.tsx
│   │   └── FlowShell.tsx
│   ├── forms/
│   │   ├── ProblemForm.tsx
│   │   ├── ContextForm.tsx
│   │   ├── BirthDateForm.tsx
│   │   ├── BirthTimeForm.tsx
│   │   ├── BirthPlaceForm.tsx
│   │   └── PartnerForm.tsx
│   ├── preview/
│   │   └── PreviewCard.tsx
│   └── access/
│       ├── Paywall.tsx
│       └── BetaForm.tsx
│
├── lib/
│   ├── analytics/
│   │   ├── posthog-client.ts
│   │   ├── posthog-server.ts
│   │   └── events.ts
│   │
│   ├── db/
│   │   ├── supabase-admin.ts
│   │   └── repository.ts
│   │
│   ├── experiment/
│   │   ├── session.ts
│   │   ├── progress.ts
│   │   └── constants.ts
│   │
│   ├── vega/
│   │   ├── client.ts
│   │   ├── mapper.ts
│   │   └── types.ts
│   │
│   ├── openai/
│   │   ├── client.ts
│   │   ├── preview-prompt.ts
│   │   └── preview-schema.ts
│   │
│   ├── places/
│   │   ├── search.ts
│   │   └── timezone.ts
│   │
│   ├── validation/
│   │   ├── profile.ts
│   │   ├── partner.ts
│   │   └── preview.ts
│   │
│   └── privacy/
│       └── retention.ts
│
├── types/
│   ├── experiment.ts
│   ├── preview.ts
│   └── api.ts
│
├── data/
│   └── places/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── supabase/
│   └── migrations/
│
├── scripts/
│   ├── qa-generate-previews.ts
│   └── cleanup-partner-input.ts
│
└── .env.example

```

El App Router utiliza routing basado en el sistema de archivos, por lo que esta estructura encaja directamente con el modelo actual de Next.js.

---

# 3. RUTAS

## `/`

Landing neutral.

No contiene formulario.

---

## `/explorar`

Router:

A / B.

---

## `/flow`

Un único componente de flujo.

No crear:

`/flow-a`

y

`/flow-b`.

El frontend renderiza según:

```text
segment
step
partner_precision

```

Esto reduce divergencias involuntarias.

---

## `/preview`

Obtiene una preview ya validada por ID.

Nunca recibe datos astrológicos por query params.

---

## `/access`

Paywall transparente.

---

## `/beta`

Formulario email.

---

# 4. ESTADO DEL EXPERIMENTO

Necesitamos distinguir cuatro identificadores.

## `anonymous_user_id`

UUID v4.

Representa al navegador/persona anónima.

Persistencia:

- cookie;
- localStorage espejo.

No es secreto.

Duración sugerida:

90 días.

---

## `session_id`

UUID por sesión del navegador.

Persistencia:

`sessionStorage`.

Una nueva sesión puede pertenecer al mismo usuario.

---

## `flow_attempt_id`

Muy importante.

Representa **un intento A o B concreto**.

Se crea al seleccionar segmento.

Permite distinguir:

```text
user
 ├── attempt A #1
 └── attempt B #2

```

Sólo el primer intento se considera:

```text
is_primary_attempt = true

```

para las métricas principales.

---

## `experiment_id`

Constante:

```text
vega_beachhead_v1

```

Configurada servidor-side.

---

# 5. QUÉ GUARDAR DÓNDE

| DatoCookielocalStorageSupabaseMemoria |   |                |          |          |
| ------------------------------------- | - | -------------- | -------- | -------- |
| anonymous\_user\_id                   | ✓ | ✓              | ✓        | ✓        |
| session\_id                           | — | sessionStorage | opcional | ✓        |
| flow\_attempt\_id                     | ✓ | ✓              | ✓        | ✓        |
| segment                               | ✓ | ✓              | ✓        | ✓        |
| trigger                               | — | ✓              | ✓        | ✓        |
| step                                  | — | ✓              | ✓        | ✓        |
| nacimiento                            | — | **NO**         | ✓        | temporal |
| texto emocional                       | — | **NO**         | ✓        | temporal |
| partner raw                           | — | **NO**         | temporal | temporal |
| preview                               | — | —              | ✓        | ✓        |
| email                                 | — | **NO**         | ✓        | temporal |

Los datos personales nunca van a localStorage.

---

# 6. REFRESH / RECUPERACIÓN

Al cargar `/flow`:

1. leer `flow_attempt_id`;
2. consultar `/api/session`;
3. backend devuelve:
   - segmento;
   - último step permitido;
   - flags de completitud;
4. frontend continúa ahí.

No devuelve datos personales completos.

Ejemplo:

```json
{
  "segment": "A",
  "lastCompletedStep": "birth_time",
  "birthDateCompleted": true,
  "birthTimeKnown": false
}

```

---

# 7. CAMBIO DE SEGMENTO

Permitido libremente antes de:

`problem_complete`.

Después:

segmento bloqueado para ese `flow_attempt_id`.

Si el usuario vuelve al router:

> “Ya has empezado esta experiencia. Si cambias de opción comenzaremos un nuevo intento.”

Nuevo:

`flow_attempt_id`.

Mismo:

`anonymous_user_id`.

Segundo intento:

```text
is_primary_attempt = false

```

Los dashboards principales filtran:

```text
is_primary_attempt = true

```

Así evitamos doble conteo.

---

# 8. SUPABASE — MODELO SQL

## Extensiones

```sql
create extension if not exists pgcrypto;

```

---

## `experiment_users`

```sql
create table public.experiment_users (
    id uuid primary key default gen_random_uuid(),
    anonymous_user_id uuid not null unique,
    experiment_id text not null,
    first_seen_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now(),
    traffic_source text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    placement text,
    device_type text,
    is_test boolean not null default false
);

create index idx_experiment_users_experiment
    on public.experiment_users(experiment_id);

create index idx_experiment_users_test
    on public.experiment_users(is_test);

```

### Discrepancia `is_test=false` — investigada y cerrada

Una auditoría de solo lectura sobre el proyecto Supabase real detectó 142
de los 180 `experiment_users` totales con `is_test=false` (los 38
restantes, `is_test=true`), lo que quedó anotado como un hallazgo
pendiente de investigar antes de reabrir tráfico real. Una segunda
auditoría, también de solo lectura y sin tocar ninguna fila, caracterizó
esos 142 registros:

- los 142 pertenecen a `vega_beachhead_v1`, el único `experiment_id` en uso;
- se concentran únicamente en tres días: 18, 27 y 28 de septiembre;
- `device_type` es desktop en el 100% de los casos;
- ninguno tiene UTMs; 116 aparecen como `referral` y 26 como `direct`;
- existen ráfagas muy concentradas por minuto (picos de 14, 11, 9 filas
  en el mismo minuto) — un patrón incompatible con tráfico real disperso
  o con usuarios individuales navegando a su propio ritmo;
- 115 de los 142 crearon al menos un `flow_attempt`, 75 lo completaron,
  74 tienen `problem_context`, 75 tienen `user_birth_profile`, 28
  generaron `preview` — y **cero** llegaron a `waitlist` o a
  `priced_access_intent`;
- desglose por día: 18 de septiembre, 87 usuarios / 70 intentos / 0
  previews; 27 de septiembre, 26 / 26 / 11; 28 de septiembre, 29 / 19 / 17;
- el desarrollo y las pruebas correspondientes a esas fechas se
  realizaron localmente.

**Conclusión:** registros históricos de desarrollo/pruebas locales
creados antes de usar de forma sistemática el flag de test/gate actual.
No se consideran tráfico real del experimento.

**Cautela:** la conclusión se basa en el patrón técnico y temporal
observado y en el contexto de desarrollo; no en una identificación
individual de cada fila.

Consistente con el código actual: mientras `EXPERIMENT_ACCEPTING_REAL_TRAFFIC`
esté en `false` (sección "PostHog" más arriba, y `libs/experiment/constants.ts`),
tanto `GET /api/session` como `POST /api/segment` devuelven 503 antes de
llamar a `bootstrapSession` si la petición no está marcada como tráfico
de test (`?test=1`/cookie `vega_test`) — es decir, hoy es estructuralmente
imposible crear una fila `is_test=false` a través de la aplicación. Estas
142 filas son anteriores a que esa convención se aplicara de forma
sistemática.

Ninguna fila fue borrada ni modificada como parte de esta investigación;
no se ha tocado el esquema, el gate técnico ni el flag `EXPERIMENT_ACCEPTING_REAL_TRAFFIC`.

---

## Añadir `flow_attempts`

Aunque no estaba en la Fase 4C, técnicamente es necesaria.

```sql
create table public.flow_attempts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.experiment_users(id)
        on delete cascade,

    segment text not null
        check (segment in ('A','B')),

    trigger text,
    current_step text,

    partner_precision text
        check (
          partner_precision is null or
          partner_precision in ('full','partial','minimal')
        ),

    is_primary_attempt boolean not null default true,

    started_at timestamptz not null default now(),
    completed_at timestamptz
);

create index idx_flow_attempts_user
    on public.flow_attempts(user_id);

create index idx_flow_attempts_segment
    on public.flow_attempts(segment);

create unique index only_one_primary_attempt
    on public.flow_attempts(user_id)
    where is_primary_attempt = true;

```

---

## `problem_context`

```sql
create table public.problem_context (
    id uuid primary key default gen_random_uuid(),

    flow_attempt_id uuid not null unique
        references public.flow_attempts(id)
        on delete cascade,

    trigger text not null,

    free_text text,
    text_provided boolean not null default false,

    created_at timestamptz not null default now(),
    delete_after timestamptz
);

```

`free_text` es sensible.

No exponer al cliente.

### Retención automática (verificado, implementación real)

Implementado mediante
`supabase/migrations/20260107000000_experiment_personal_data_retention.sql`:
la columna `delete_after` (ya existía en el esquema, pero nunca se
rellenaba) recibió un backfill `created_at + interval '30 days'` para
las filas existentes y pasó a `not null default (now() + interval '30
days')` para las nuevas, con índice `idx_problem_context_delete_after`.
El plazo se cuenta siempre desde la creación de cada fila, nunca desde
el cierre del experimento. Purgado por la función consolidada
`public.purge_expired_experiment_personal_data()` (ver sección 11),
con limpieza periódica programada manualmente en Supabase (`pg_cron`,
job `purge-experiment-personal-data-expired`, diario).

---

## `user_birth_profile`

```sql
create table public.user_birth_profile (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null unique
        references public.experiment_users(id)
        on delete cascade,

    birth_date date not null,

    birth_time time,
    birth_time_known boolean not null,

    place_label text not null,
    country_code char(2) not null,

    latitude double precision not null,
    longitude double precision not null,

    timezone_id text not null,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    check (
      (birth_time_known = true and birth_time is not null)
      or
      (birth_time_known = false and birth_time is null)
    )
);

```

### Retención automática (verificado, implementación real)

Implementado mediante la misma migración
`supabase/migrations/20260107000000_experiment_personal_data_retention.sql`:
columna `delete_after` nueva, con backfill `created_at + interval '30
days'` para las filas existentes, `not null default (now() + interval
'30 days')` para las nuevas, índice
`idx_user_birth_profile_delete_after`. Purgado por
`public.purge_expired_experiment_personal_data()` (sección 11), con el
mismo cron diario (`purge-experiment-personal-data-expired`).

---

## `partner_input`

Temporal.

```sql
create table public.partner_input (
    id uuid primary key default gen_random_uuid(),

    flow_attempt_id uuid not null unique
        references public.flow_attempts(id)
        on delete cascade,

    birth_date date not null,

    birth_time time,
    birth_time_known boolean,

    place_label text,
    country_code char(2),

    latitude double precision,
    longitude double precision,
    timezone_id text,

    created_at timestamptz not null default now(),

    expires_at timestamptz not null
        default (now() + interval '24 hours')
);

```

**Actualizado el 2026-10-07** (`supabase/migrations/20260109000000_segment_b_retention_reduction.sql`):
el `DEFAULT` de `expires_at` se redujo a `now() + interval '1 hour'` —
el boceto de arriba refleja el esquema original de Sprint 2, ya
superado por esa migración posterior (ver también sección 11).

No:

- nombre;
- email;
- alias;
- teléfono.

---

## `partner_derived_profile`

```sql
create table public.partner_derived_profile (
    id uuid primary key default gen_random_uuid(),

    flow_attempt_id uuid not null unique
        references public.flow_attempts(id)
        on delete cascade,

    partner_precision text not null
        check (
          partner_precision in ('full','partial','minimal')
        ),

    derived_features jsonb not null,

    created_at timestamptz not null default now(),

    delete_after timestamptz
);

```

Debe contener sólo información astrológica derivada necesaria para continuar el experimento.

### Esquema real (verificado, difiere del boceto de arriba)

La tabla real (migración Sprint 3B) añade `partner_precision` y
`synastry_status` como columnas `not null` con `check`, y `delete_after`
es `not null default (now() + interval '30 days')` desde su creación —
no nullable como en el boceto de arriba. **Actualizado el 2026-10-07**
(`supabase/migrations/20260109000000_segment_b_retention_reduction.sql`):
el `DEFAULT` se redujo a `now() + interval '24 hours'`, reformulado
explícitamente como retención exclusiva para continuidad/reintentos de
corto plazo del Segmento B, no como ventana general de revisión
posterior — ver `VEGA_Base_Juridica_Segmento_B_v1.md`.

### Retención automática (verificado)

Entre el 2026-10-07 (migración
`supabase/migrations/20260107000000_experiment_personal_data_retention.sql`)
y el 2026-10-07 posterior (migración
`supabase/migrations/20260109000000_segment_b_retention_reduction.sql`),
esta tabla pasó por dos regímenes distintos: primero se incorporó a la
función consolidada `public.purge_expired_experiment_personal_data()`
junto con `problem_context`, `user_birth_profile` y `previews` (cron
diario `purge-experiment-personal-data-expired`); después, al reducir
su vigencia a 24h, **se sacó de nuevo de esa función** para darle su
propia purga dedicada — `public.purge_expired_partner_derived_profile()`
— pensada para un cron horario independiente
(`purge-partner-derived-profile-expired`, pendiente de crear
manualmente en Supabase), porque una cadencia diaria sobre una vigencia
de 24h dejaba un margen operativo real de hasta ~48h entre caducidad
lógica y eliminación física (hallazgo de la revisión de seguridad del
2026-10-07). La lectura de esta tabla (`getPartnerDerivedProfileByFlowAttempt`)
además ya no depende solo del cron: trata cualquier fila con
`delete_after` en el pasado como inexistente, con independencia de si
el borrado físico ya ha ocurrido.

---

## `previews`

```sql
create table public.previews (
    id uuid primary key default gen_random_uuid(),

    flow_attempt_id uuid not null
        references public.flow_attempts(id)
        on delete cascade,

    schema_version text not null default 'preview_v1',
    prompt_version text not null,
    model_id text not null,

    partner_precision text,

    preview_json jsonb not null,

    generation_status text not null
        check (
          generation_status in (
            'valid',
            'invalid',
            'error'
          )
        ),

    latency_ms integer,

    created_at timestamptz not null default now()
);

create index idx_previews_attempt
    on public.previews(flow_attempt_id);

```

### Retención automática (verificado, implementación real)

Implementado mediante
`supabase/migrations/20260107000000_experiment_personal_data_retention.sql`:
columna `delete_after` nueva, con backfill `created_at + interval '30
days'` para las filas existentes, `not null default (now() + interval
'30 days')` para las nuevas, índice `idx_previews_delete_after`.
Purgada por `public.purge_expired_experiment_personal_data()` (sección
11), con el mismo cron diario.

---

## `priced_access_intents`

Añadir tabla explícita.

```sql
create table public.priced_access_intents (
    id uuid primary key default gen_random_uuid(),

    flow_attempt_id uuid not null unique
        references public.flow_attempts(id)
        on delete cascade,

    price_minor integer not null default 999,
    currency char(3) not null default 'EUR',

    created_at timestamptz not null default now()
);

```

Permite disponer de la métrica empresarial en nuestra propia base además de PostHog.

### Retención automática (verificado, implementación real)

Esta tabla queda fuera, deliberadamente, de la retención de 30 días del
núcleo de datos personales (`problem_context`/`user_birth_profile`/
`previews`/`partner_derived_profile`, arriba, y sección 11): es la
fuente granular de la conversión `priced_access_intent`, necesaria para
la métrica principal del experimento mientras este sigue en marcha.

Implementado mediante
`supabase/migrations/20260108000000_priced_access_intents_retention.sql`:
columna `expires_at` nueva, `not null`, `default (now() + interval '12
months')`, con backfill `created_at + interval '12 months'` para las
filas existentes, e índice `idx_priced_access_intents_expires`. Purgada
por una función propia e independiente de
`purge_expired_experiment_personal_data()`:
`public.purge_expired_priced_access_intents()` (`security definer`,
`search_path = public`, sin `EXECUTE` para
`public`/`anon`/`authenticated`), probada con filas sintéticas en una
transacción revertida. Limpieza periódica programada manualmente en
Supabase (`pg_cron`, job `purge-priced-access-intents-expired`,
`schedule = 0 3 * * *`, `active = true`).

Política: se conserva durante el experimento; al cierre y una vez
guardada la métrica final en otro sitio, está prevista una purga
manual (no automática) de estos registros. El límite de 12 meses es
una red de seguridad frente a una conservación indefinida si esa purga
manual no llega a ejecutarse — no es el plazo de conservación
pretendido en condiciones normales.

---

## `waitlist`

```sql
create table public.waitlist (
    id uuid primary key default gen_random_uuid(),

    flow_attempt_id uuid not null unique
        references public.flow_attempts(id)
        on delete cascade,

    email text not null,

    consent_version text not null,

    confirmation_status text not null
        default 'pending'
        check (
          confirmation_status in (
            'pending',
            'sent',
            'failed'
          )
        ),

    created_at timestamptz not null default now()
);

create index idx_waitlist_email
    on public.waitlist(lower(email));

```

### Retención automática (verificado, implementación real)

Implementado mediante
`supabase/migrations/20260106000000_experiment_waitlist_retention.sql`
(posterior a Sprint 4): `expires_at timestamptz not null default (now()
+ interval '12 months')`, backfill de filas existentes con su propio
`created_at + interval '12 months'`, índice `idx_waitlist_expires`, y
función `public.purge_expired_waitlist_entries()` (`security definer`,
`search_path = public`, sin `EXECUTE` para `public`/`anon`/`authenticated`).
Probada con una fila sintética caducada dentro de una transacción
revertida (`ROLLBACK`), sin dejar datos de prueba. El job periódico
(`jobname = purge-waitlist-expired`, `schedule = 0 3 * * *`, `active =
true`) se configuró manualmente en Supabase vía `pg_cron`, no en la
migración — mismo patrón operativo que la purga de `partner_input`
(sección 11 de este documento). `partner_derived_profile` ya no sigue
ese patrón independiente: desde
`supabase/migrations/20260107000000_experiment_personal_data_retention.sql`
se purga junto con `problem_context`, `user_birth_profile` y `previews`
mediante la función consolidada
`public.purge_expired_experiment_personal_data()` (ver las secciones
correspondientes, arriba).

---

# 9. RLS

Activar en todas:

```sql
alter table public.experiment_users enable row level security;
alter table public.flow_attempts enable row level security;
alter table public.problem_context enable row level security;
alter table public.user_birth_profile enable row level security;
alter table public.partner_input enable row level security;
alter table public.partner_derived_profile enable row level security;
alter table public.previews enable row level security;
alter table public.priced_access_intents enable row level security;
alter table public.waitlist enable row level security;

```

Para este MVP:

**no crear políticas para** **`anon`****.**

El navegador no debe consultar Supabase directamente.

Revocar permisos `anon`/`authenticated` sobre estas tablas.

El acceso se realiza exclusivamente mediante cliente server-side.

Esto sigue las recomendaciones actuales de Supabase: habilitar RLS en toda tabla expuesta y revisar también los grants, no sólo las policies.

---

# 10. CIFRADO

No introduciría cifrado de aplicación columna-a-columna todavía salvo revisión legal que lo requiera.

Sí:

- TLS;
- cifrado de almacenamiento proporcionado por plataforma;
- claves únicamente servidor;
- acceso administrativo restringido;
- RLS;
- minimización;
- retención corta.

El dato más sensible del experimento —texto libre— podría añadirse posteriormente a cifrado de aplicación si el riesgo lo justifica.

---

# 11. ELIMINACIÓN AUTOMÁTICA PARTNER

Objetivo principal:

**eliminar** **`partner_input`** **inmediatamente tras derivación correcta.**

Pipeline:

```text
partner_input
   ↓
Vega calculation
   ↓
partner_derived_profile committed
   ↓
DELETE partner_input

```

Todo dentro del flujo servidor.

Si falla el `DELETE`:

`expires_at <= now()+1h` (reducido desde `now()+24h` el 2026-10-07,
`supabase/migrations/20260109000000_segment_b_retention_reduction.sql`,
para reforzar el test de necesidad de la base jurídica de interés
legítimo del Segmento B — ver `VEGA_Base_Juridica_Segmento_B_v1.md`).

Como defensa secundaria, job horario:

```sql
delete
from public.partner_input
where expires_at < now();

```

### Estado real (verificado)

Implementado. El borrado inmediato tras derivación correcta ya ocurre
en el propio flujo de servidor (`safeguardDeletePartnerInput`,
invocado desde el pipeline de sinastría justo después de persistir
`partner_derived_profile`). Como defensa secundaria, el `DELETE` de
arriba se ejecuta mediante un job de `pg_cron` configurado manualmente
en Supabase (no en ninguna migración): `jobname =
purge-partner-input-expired`, `schedule = 0 * * * *` (horario),
`active = true` — sin cambios en el cron. No usa n8n. Por esa cadencia
horaria, el tiempo real máximo hasta la eliminación efectiva de una
fila cuyo borrado inmediato haya fallado puede aproximarse a **2
horas** (1h de `expires_at` + hasta 1h adicional hasta la siguiente
ejecución del cron), no "1 hora" sin más.

### Retención del núcleo de datos personales (implementado, verificado)

Además de `partner_input` (arriba), el resto del núcleo de datos
personales del experimento tiene retención automática desde
`supabase/migrations/20260107000000_experiment_personal_data_retention.sql`:

- `problem_context`, `user_birth_profile`, `previews`: **30 días**
  (`delete_after` = `created_at` + 30 días), purgadas por la función
  consolidada `public.purge_expired_experiment_personal_data()`
  (`security definer`, `search_path = public`, sin `EXECUTE` para
  `public`/`anon`/`authenticated`) y el cron diario `jobname =
  purge-experiment-personal-data-expired`, `schedule = 0 3 * * *`,
  configurado manualmente en Supabase — sin cambios.
- `partner_derived_profile`: **vigencia de 24 horas** (`delete_after` =
  `created_at` + 24 horas, reducida desde 30 días el 2026-10-07,
  `supabase/migrations/20260109000000_segment_b_retention_reduction.sql`,
  exclusivamente para continuidad/reintentos de corto plazo del
  Segmento B — ver `VEGA_Base_Juridica_Segmento_B_v1.md`). Tras esas 24h
  el dato deja de poder reutilizarse para ese fin, con independencia de
  si ya se ha eliminado físicamente — comprobación aplicada en el
  propio código de lectura (`getPartnerDerivedProfileByFlowAttempt`,
  tanto en `libs/db/supabase-repository.ts` como en
  `libs/db/memory-repository.ts`), no solo en el plazo de purga. **Ya
  no se purga junto con las tres tablas anteriores**: desde la misma
  migración de 2026-10-07 tiene su propia función dedicada,
  `public.purge_expired_partner_derived_profile()` (`security
  definer`, `search_path = public`, sin `EXECUTE` para
  `public`/`anon`/`authenticated`), pensada para un cron **horario**
  independiente del diario anterior — el job correspondiente
  (`purge-partner-derived-profile-expired`, `schedule = 0 * * * *`)
  queda pendiente de crear manualmente en el dashboard de Supabase
  antes de aplicar la migración a producción. Con esa función horaria
  ya vigente, el margen operativo real entre caducidad lógica y
  eliminación física queda en hasta ~1 hora, no en las ~24h que
  resultarían de dejarla en la purga diaria consolidada.
- Tablas explícitamente excluidas de la función consolidada:
  `experiment_users`, `flow_attempts`, `priced_access_intents`,
  `partner_input`, `waitlist`, y ahora también `partner_derived_profile`
  (con su propia función y cron dedicados, arriba). Las dos primeras son
  el padre, vía `on delete cascade`, de todas las demás tablas del
  experimento — purgarlas arrastraría también `waitlist` (12 meses) y
  `priced_access_intents` sin importar su propia antigüedad, por eso
  nunca se tocan aquí. Ambas se describen mejor como datos técnicos
  pseudonimizados (no contienen texto libre, nacimiento ni email) que
  como "sin ningún dato personal": siguen siendo el enlace técnico
  entre un usuario anónimo y el resto de sus datos.
- Probado en una transacción revertida (`BEGIN; ... ROLLBACK;`) con
  filas sintéticas vencidas y no vencidas en las 3 tablas que cubre hoy
  la función consolidada (`problem_context`, `user_birth_profile`,
  `previews`), confirmando borrado selectivo, idempotencia, y que
  ninguna tabla fuera de alcance cambia.
- `priced_access_intents` queda fuera de esta política deliberadamente
  (es la fuente granular de la conversión `priced_access_intent`
  mientras el experimento está en marcha); tiene su propia retención
  implementada — 12 meses como red de seguridad automática
  (`expires_at`, función `purge_expired_priced_access_intents()`, cron
  `purge-priced-access-intents-expired` diario), con una purga manual
  prevista al cierre del experimento, una vez guardada la métrica
  final (ver la sección `priced_access_intents` más arriba para el
  detalle completo).

---

# 12. FORMULARIOS

Recomiendo:

### React Hook Form

-

### Zod

Ventajas:

- ligeros;
- compatibles con TypeScript;
- mismo schema reutilizable frontend/backend;
- errores controlados.

Regla:

validación frontend = UX.

validación backend = seguridad.

Nunca confiar en frontend.

---

# 13. FECHA

Zod:

- fecha válida;
- no futura;
- rango razonable.

No impondría edad mínima mediante deducción silenciosa.

El experimento está dirigido a 18+ mediante Meta y debería mostrar requisito 18+.

---

# 14. HORA

Dos estados excluyentes:

```text
known
unknown

```

Si `known`:

hora obligatoria.

Si `unknown`:

`birth_time = null`.

Nunca:

`12:00` como hora artificial.

Eso contaminaría el cálculo.

---

# 15. LUGAR / GEOCODING

No recomiendo Mapbox para este MVP.

Mapbox Temporary Geocoding permite hasta 100.000 requests gratuitos/mes, pero sus condiciones diferencian entre búsquedas temporales y resultados que se almacenan permanentemente; Permanent Geocoding es de pago.

Como Vega sólo necesita:

> ciudad de nacimiento,

propongo una solución más simple.

---

# 16. CATÁLOGO LOCAL DE CIUDADES

Cargar un dataset de localidades, por ejemplo:

**GeoNames**.

Guardar:

```text
geoname_id
name
ascii_name
country_code
admin1
latitude
longitude
population

```

Endpoint:

```text
GET /api/places?q=madrid

```

Devuelve máximo 10 resultados.

---

# 17. LOCALIDADES DUPLICADAS

Mostrar:

```text
Madrid — Comunidad de Madrid — España
Madrid — Iowa — Estados Unidos

```

Orden:

1. match exacto;
2. país esperado;
3. población.

El usuario siempre confirma.

---

# 18. TIMEZONE

Después de lat/lon:

resolver IANA timezone:

```text
Europe/Madrid
America/Mexico_City
America/Argentina/Buenos_Aires

```

Puede realizarse con una librería geográfica local tipo `tz-lookup`.

Pero el **offset histórico** no debe calcularlo el frontend.

Enviar al motor:

```text
date
local_time
timezone_id
lat
lon

```

El motor resuelve el offset correcto utilizando la base IANA/tzdata correspondiente a esa fecha.

Esto es importante para:

- horario de verano;
- cambios legislativos históricos;
- offsets históricos.

---

# 19. API CONTRACT — PERFIL PROPIO

### Request

`POST /api/own-profile`

```json
{
  "flowAttemptId": "uuid",
  "birthDate": "1980-04-27",
  "birthTimeKnown": true,
  "birthTime": "14:35",
  "placeId": 3117735
}

```

### Response

```json
{
  "ok": true,
  "precision": "full",
  "nextStep": "preview"
}

```

B responde:

```json
{
  "nextStep": "partner"
}

```

---

# 20. API CONTRACT — PARTNER

`POST /api/partner`

```json
{
  "flowAttemptId": "uuid",
  "birthDate": "1982-08-11",
  "birthTimeKnown": false,
  "placeId": 3117735
}

```

Response:

```json
{
  "ok": true,
  "partnerPrecision": "partial",
  "analysisPossible": true
}

```

Minimal:

```json
{
  "birthDate": "1982-08-11"
}

```

Servidor decide si es viable.

No el navegador.

---

# 21. CONTRATO VEGA — A

Next.js llama al motor:

```json
{
  "request_type": "preview_context",
  "profile": {
    "birth_date": "1980-04-27",
    "local_time": "14:35",
    "timezone": "Europe/Madrid",
    "latitude": 40.4168,
    "longitude": -3.7038,
    "time_precision": "exact"
  },
  "context": {
    "segment": "A",
    "trigger": "career"
  },
  "include": [
    "natal_chart",
    "relevant_current_transits"
  ]
}

```

---

# 22. RESPUESTA VEGA — A

```json
{
  "calculation_id": "...",
  "precision": {
    "birth_time": "exact"
  },
  "natal_factors": [],
  "current_transits": [],
  "allowed_evidence": [
    {
      "id": "ev_001",
      "type": "natal_aspect",
      "label": "...",
      "data": {}
    },
    {
      "id": "ev_002",
      "type": "transit",
      "label": "...",
      "data": {}
    }
  ]
}

```

`allowed_evidence` debe ser elaborado por código/reglas, no por OpenAI.

---

# 23. CONTRATO VEGA — B

```json
{
  "request_type": "relationship_preview_context",
  "user_profile": {},
  "partner_profile": {},
  "partner_precision": "partial",
  "context": {
    "segment": "B",
    "trigger": "distance"
  },
  "include": [
    "synastry",
    "relevant_current_factors"
  ]
}

```

Respuesta:

```json
{
  "partner_precision": "partial",
  "excluded": [
    "partner_houses",
    "partner_ascendant",
    "partner_mc"
  ],
  "synastry_factors": [],
  "current_factors": [],
  "allowed_evidence": []
}

```

---

# 24. REGLA ABSOLUTA

OpenAI jamás recibe instrucciones como:

> “calcula el Ascendente”.

Sólo recibe:

> “interpreta estos factores ya calculados”.

---

# 25. PREVIEW PIPELINE

```text
REQUEST
  ↓
Zod validation
  ↓
Session / ownership validation
  ↓
Load birth/context
  ↓
Motor Vega
  ↓
Validate Vega response
  ↓
Filter allowed_evidence
  ↓
Build OpenAI input
  ↓
Structured Output
  ↓
JSON schema validation
  ↓
Evidence validation
  ↓
Safety validation
  ↓
Persist preview
  ↓
Delete partner raw data
  ↓
Return preview

```

---

# 26. OPENAI — MODELO

No fijaría el modelo en código.

Variable:

```text
OPENAI_PREVIEW_MODEL=gpt-5.6-luna

```

Empezaría QA con **GPT-5.6 Luna** porque está orientado a cargas sensibles a coste y actualmente cuesta $0,20 por millón de tokens de entrada y $1,20 por millón de salida. Si el QA cualitativo no supera el umbral, la primera escalada sería probar Terra sin cambiar la arquitectura.

---

# 27. SYSTEM PROMPT PREVIEW

Conceptualmente:

```text
You are Vega's interpretation layer.

Your job is to transform ONLY the provided validated astrological
evidence into a concise Spanish preview.

RULES:

1. Never calculate astronomical or astrological positions.
2. Never introduce a planet, aspect, house, sign, transit, angle,
   placement or relationship factor that is not present in
   allowed_evidence.
3. Every evidence item in the output must reference exactly one
   allowed_evidence.id.
4. Do not predict deterministic outcomes.
5. Do not claim to know another person's private thoughts, intentions
   or feelings.
6. Do not give medical, legal or financial conclusions.
7. Explain uncertainty whenever precision is limited.
8. Use clear Spanish for a user without astrology knowledge.
9. Follow preview_v1 exactly.
10. If the evidence is insufficient, return insufficient_evidence=true.

```

El prompt real debe versionarse:

```text
preview_prompt_v1

```

---

# 28. INPUT OPENAI

```json
{
  "segment": "A",
  "trigger": "career",
  "user_context": "Estoy pensando cambiar...",
  "precision": {
    "birth_time": "exact"
  },
  "allowed_evidence": [
    {
      "id": "ev_001",
      "label": "...",
      "interpretation_hint": "..."
    },
    {
      "id": "ev_002",
      "label": "...",
      "interpretation_hint": "..."
    }
  ]
}

```

Enviar sólo la cantidad de evidencia necesaria.

No toda la carta si no es necesaria.

---

# 29. OUTPUT `preview_v1`

Structured Outputs:

```json
{
  "main_insight": "...",
  "evidence": [
    {
      "id": "ev_001",
      "label": "..."
    },
    {
      "id": "ev_002",
      "label": "..."
    }
  ],
  "contextual_interpretation": "...",
  "limitation": "...",
  "open_question": "...",
  "unsupported_claims": [],
  "safety_flags": [],
  "insufficient_evidence": false
}

```

Structured Outputs permite exigir que la respuesta coincida con un JSON Schema proporcionado por la aplicación.

---

# 30. TIMEOUT OPENAI

Inicial:

**15 segundos.**

Si timeout:

1. registrar error;
2. reintentar una vez;
3. timeout segundo intento;
4. `preview_generation_error`.

No realizar infinitos retries.

---

# 31. RETRY

Sólo un retry automático.

Aplicable a:

- timeout;
- error 5xx;
- schema failure corregible.

No repetir automáticamente ante:

- safety failure;
- Vega insufficient evidence;
- input inválido.

---

# 32. VALIDACIÓN PROGRAMÁTICA

Tras Structured Output, ejecutar Zod.

Reglas:

### Evidencias

```text
length === 2

```

Cada:

```text
output.evidence[i].id

```

debe existir exactamente en:

```text
allowed_evidence

```

---

## Longitud

Aproximada:

```text
main_insight: 40–60 palabras
contextual_interpretation: 60–80
limitation: 1 frase
open_question: 1 pregunta

```

No rechazar por una desviación mínima de 1–2 palabras.

Sí por:

80 palabras donde debe haber 40–60.

---

# 33. UNSUPPORTED CLAIM

Si:

```text
unsupported_claims.length > 0

```

invalidar.

No mostrar.

---

# 34. SAFETY FLAGS

Lista blanca:

```text
[]

```

Ideal.

Podrían existir flags informativos aceptables, pero para el experimento inicial recomiendo:

cualquier safety flag → revisión/error.

Mejor perder una preview que mostrar una problemática.

---

# 35. INSUFFICIENT EVIDENCE

Si:

```text
insufficient_evidence = true

```

no utilizar retry para “obligar” al modelo a inventar.

Mostrar:

> No disponemos de suficiente información para generar esta lectura con fiabilidad.

---

# 36. LOGGING OPENAI

Guardar sólo:

```text
request_id
model
prompt_version
schema_version
token_usage
latency
status
error_type

```

No imprimir en logs:

- contexto emocional;
- nacimiento;
- partner data;
- full prompt.

---

# 37. POSTHOG

Crear proyecto en:

### EU — Frankfurt.

PostHog ofrece expresamente cloud EU además de US.

---

# 38. IDENTIDAD

Cliente:

```text
posthog.identify(anonymous_user_id)

```

No utilizar:

- email;
- fecha;
- nombre.

Al llegar a waitlist **no reemplazar** con email.

Seguimos con UUID.

---

# 39. EVENTOS FRONTEND

Frontend registra únicamente eventos que representan interacción visible:

```text
neutral_landing_view
router_view
segment_selected
segment_entry
problem_selected
problem_text_added
own_profile_start
birth_date_added
birth_time_added
birth_time_unknown
birth_place_added
partner_data_start
preview_view
preview_completion
paywall_view
priced_cta_click

```

No payload sensible.

---

# 40. EVENTOS BACKEND

El backend registra estados que sólo debe declarar cuando realmente se han persistido/validado:

```text
own_profile_complete
partner_full_data
partner_partial_data
partner_minimal_data
partner_analysis_possible
onboarding_complete
preview_generation_start
preview_generation_error
priced_access_intent
waitlist_submit

```

Esto evita registrar completions falsas producidas sólo en UI.

---

# 41. IDEMPOTENCIA

Cada evento crítico lleva:

```text
event_key

```

Ejemplo:

```text
{flow_attempt_id}:own_profile_complete

```

Persistir en una tabla opcional:

`event_deduplication`.

Pero para evitar otra tabla, los estados únicos de DB ya garantizan buena parte del comportamiento.

---

# 42. REGLAS EVENTOS

## `segment_selected`

Puede ocurrir más de una vez durante navegación inicial.

Pero para análisis principal:

usar la primera selección del `flow_attempt_id`.

---

## `own_profile_complete`

Backend sólo emite cuando la operación pasa de:

```text
incomplete → complete

```

No en cada update.

---

## `preview_view`

Frontend usa `sessionStorage`:

```text
preview_view:{preview_id}=true

```

Una sola vez por session/preview.

Para conversión, PostHog puede además trabajar con personas únicas.

---

## `priced_cta_click`

Bloquear botón inmediatamente:

```text
disabled = true

```

hasta navegación.

Event UUID:

```text
crypto.randomUUID()

```

---

## `priced_access_intent`

Insert DB con:

```text
unique(flow_attempt_id)

```

Si el usuario pulsa dos veces:

DB devuelve existente.

Evento PostHog backend sólo cuando INSERT nuevo.

---

## `waitlist_submit`

`unique(flow_attempt_id)`.

Mismo patrón.

---

# 43. SESSION REPLAY

Puede resultar útil para UX, pero existe un riesgo de capturar formularios.

Por tanto:

### O bien

desactivarlo durante la primera prueba.

### O bien

habilitarlo únicamente con masking agresivo:

- todos los inputs;
- textareas;
- datos de nacimiento;
- lugares;
- emails.

Mi recomendación:

**primera versión sin session replay.**

Menos riesgo.

Los funnels bastan para el experimento.

---

# 44. PAYWALL

`/preview`

↓

CTA:

**Continuar con Vega**

↓

`/access`

Pantalla:

```text
9,99 €
Beta cerrada
Hoy no se realizará ningún cargo

```

Al render:

`paywall_view`.

---

# 45. PRICED CTA

Botón:

**Quiero acceso por 9,99 €**

Frontend:

`priced_cta_click`.

Navega a:

`/access/confirm` o estado interno.

---

# 46. CONFIRMACIÓN

Texto:

> El precio previsto es 9,99 €. Todavía no aceptamos pagos.

Botón:

**Sí, quiero acceso por 9,99 € cuando esté disponible**

POST:

`/api/priced-intent`.

Backend:

1. valida sesión;
2. valida que existe preview;
3. valida paywall version;
4. INSERT único;
5. captura backend `priced_access_intent`.

Después:

`/beta`.

---

# 47. WAITLIST

POST `/api/waitlist`

Request:

```json
{
  "email": "usuario@example.com",
  "consentVersion": "beta_v1"
}

```

Backend:

- valida email;
- inserta;
- devuelve éxito.

Después de COMMIT:

n8n no forma parte de la respuesta.

---

# 48. N8N

Workflow mínimo:

```text
Supabase Database Webhook
         ↓
waitlist INSERT
         ↓
Validate payload
         ↓
Send email
         ↓
Update confirmation_status

```

## Nodo 1

Webhook n8n.

## Nodo 2

IF:

`confirmation_status == pending`.

## Nodo 3

Proveedor email.

Recomiendo Resend para MVP.

Su plan gratuito actual contempla hasta 3.000 emails/mes y 100/día, sobrado para este experimento.

## Nodo 4

Supabase update:

```text
sent

```

Si falla:

```text
failed

```

El registro de waitlist sigue existiendo.

---

# 49. QA UNITARIO

Framework:

**Vitest**.

Tests:

### Zod

- fechas;
- hora conocida/desconocida;
- triggers;
- email;
- partner levels.

### Preview validator

- 2 evidencias;
- ID inexistente;
- unsupported claim;
- longitud;
- campos faltantes.

### Experiment state

- primer intento;
- segundo intento;
- primary attempt;
- segment lock.

---

# 50. TESTS DE INTEGRACIÓN

Mock Vega.

Mock OpenAI.

Probar:

### A full

Vega válido → OpenAI válido → preview.

### A sin hora

Factor exclusion correcta.

### B full

Full sinastry.

### B partial

No houses/angles.

### B minimal

Sólo features permitidos.

### B no viable

No llamar OpenAI.

### OpenAI hallucinated evidence

Debe rechazarse.

### Timeout

Retry único.

### Waitlist

DB commit aunque n8n caiga.

---

# 51. E2E

### Playwright

Sí lo recomiendo.

Journeys:

```text
A full
A unknown time
B full
B partial
B minimal
B not viable
preview API error
user abandonment
priced intent
waitlist
refresh/resume
back navigation
double click

```

---

# 52. TEST ESENCIAL DE PRIVACIDAD

Playwright/network assertions:

comprobar que PostHog **nunca recibe** patrones compatibles con:

```text
birth_date
birth_time
latitude
longitude
email
problem_text
place_label
partner data

```

Este test merece existir explícitamente.

---

# 53. QA AUTOMÁTICO DE 40 PREVIEWS

Script:

```text
scripts/qa-generate-previews.ts

```

Genera:

20 A.

20 B.

Usando casos QA controlados.

---

# 54. TABLA QA

Crear:

`preview_qa_scores`

sólo staging/admin.

Campos:

```text
preview_id
blind_code
segment_hidden
specificity
clarity
personalization
depth
traceability
non_repetition
safety
hallucination_free
reviewer_notes
reviewer_id

```

Durante revisión:

no mostrar `segment`.

Usar:

```text
QA-001
QA-002
...

```

Después revelar A/B.

---

# 55. QA GATE

SQL/consulta:

```text
avg(A)
avg(B)
abs(avg(A)-avg(B)) <= 0.25

```

Y:

```text
all safety >= 4
all hallucination_free == 5
overall >= 4

```

Si falla:

NO-GO.

---

# 56. DASHBOARD POSTHOG — EXECUTIVE

## Insight 1

Unique users:

`router_view`.

## Insight 2

Funnel:

```text
router_view
→ segment_selected

```

Breakdown:

`segment`.

## Insight 3

Formula:

A:

```text
priced_access_intent / segment_entry

```

B:

mismo.

## Insight 4

Downstream:

```text
priced_access_intent / paywall_view

```

Breakdown segment.

## Insight 5

Guardrail:

```text
onboarding_complete / onboarding_start

```

---

# 57. FUNNEL A

Filtro:

```text
segment=A
is_primary_attempt=true
is_test=false

```

Steps:

```text
segment_entry
problem_complete
own_profile_complete
onboarding_complete
preview_view
preview_completion
paywall_view
priced_cta_click
priced_access_intent
waitlist_submit

```

Conversión:

unique users.

---

# 58. FUNNEL B

Mismos filtros.

Steps:

```text
segment_entry
problem_complete
own_profile_complete
partner_data_start
partner_analysis_possible
onboarding_complete
preview_view
preview_completion
paywall_view
priced_cta_click
priced_access_intent
waitlist_submit

```

Breakdown:

`partner_precision`.

---

# 59. A VS B

Crear tabla o trends separados:

```text
segment_entry
own_profile_complete
onboarding_complete
paywall_view
priced_access_intent

```

Breakdown:

segment.

Mostrar:

- total;
- conversion;
- relative difference.

---

# 60. ACQUISITION QUALITY

Breakdowns:

```text
placement
device_type
utm_content
day_of_week

```

Comparar:

```text
segment_selected
segment_entry
priced_access_intent

```

Objetivo:

detectar mix de tráfico anómalo.

---

# 61. TECHNICAL HEALTH

Eventos:

```text
preview_generation_start
preview_generation_error

```

Breakdown:

`error_type`.

Añadir backend metrics:

- OpenAI latency;
- Vega latency;
- place search errors;
- retries.

---

# 62. DEPLOY: VPS vs VERCEL PRO

## VPS

Ventajas:

- coste fijo potencialmente bajo;
- control total;
- ya conoces VPS/SSH;
- motor podría convivir allí.

Desventajas:

- nginx;
- TLS;
- deploys;
- process manager;
- backups;
- observabilidad;
- hardening;
- mantenimiento.

---

## Vercel Pro

Ventajas:

- integración Next.js;
- CI/CD automático;
- HTTPS/CDN;
- preview deploys;
- logs;
- env vars;
- prácticamente cero ops.

Actualmente Pro parte de **20 USD/mes** e incluye 20 USD de usage credit.

Vercel también dispone actualmente de runtime logs y tratamiento específico de variables sensibles; desde julio de 2026 los valores de variables marcadas sensibles se redactan en build logs.

---

# 63. RECOMENDACIÓN DEPLOY

## Vercel Pro.

Para este experimento.

El ahorro de horas y riesgo operativo vale más que ahorrar \~20 €.

Motor Vega:

puede permanecer donde esté actualmente si ya existe API accesible mediante HTTPS.

No migrarlo sólo por este experimento.

---

# 64. VARIABLES DE ENTORNO

```text
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

VEGA_API_URL=
VEGA_API_TOKEN=

OPENAI_API_KEY=
OPENAI_PREVIEW_MODEL=gpt-5.6-luna

N8N_WEBHOOK_SECRET=

EXPERIMENT_ID=vega_beachhead_v1

APP_URL=https://...

```

Sólo `NEXT_PUBLIC_*` llega a browser.

---

# 65. META — REQUISITOS TÉCNICOS

## Meta Pixel

No es imprescindible para nuestra medición.

Pero sí es útil para:

**Landing Page View** y diagnóstico de campaña.

Instalar únicamente el evento base:

```text
PageView

```

No enviar:

- segment;
- trigger;
- problem;
- nacimiento;
- email;
- relationship status;
- priced intent.

Meta no necesita nada de eso.

---

# 66. OPTIMIZACIÓN META

Campaña:

optimización a:

**Landing Page View.**

No enviar conversion events profundos para optimización durante el test.

PostHog es nuestra fuente de verdad experimental.

---

# 67. UTM

Ejemplo:

```text
?utm_source=meta
&utm_medium=paid_social
&utm_campaign=vega_beachhead_v1_es
&utm_content=neutral_v1
&placement={{placement}}

```

Servidor conserva los valores iniciales.

No sobrescribir en revisitas.

---

# 68. ORDEN DE IMPLEMENTACIÓN

Recomiendo 6 sprints pequeños, no 5 grandes.

---

# SPRINT 0 — BASE Y CONTRATOS

## Entregable

Repositorio, tipos y contratos congelados.

### Construir

- Next.js;
- TypeScript strict;
- ESLint;
- Vitest;
- Playwright;
- `.env.example`;
- tipos Segment/Trigger/Precision;
- schemas Zod;
- OpenAPI-like contracts internos.

### Criterio aceptación

Proyecto:

```text
build
lint
test

```

pasa.

### Dependencia

ninguna.

### Riesgo

Empezar UI sin contratos claros.

### Test

CI básica.

---

# SPRINT 1 — DATOS, SESIÓN Y ANALYTICS BASE

## Entregable

Persistencia experimental operativa.

### Construir

- migraciones Supabase;
- RLS;
- repository;
- anonymous ID;
- session ID;
- flow attempt;
- PostHog instalación;
- test/internal exclusion.

### Criterio

Usuario puede:

```text
landing → router → seleccionar A/B → refresh

```

y conservar estado.

### Riesgo

Duplicados.

### Tests

- refresh;
- nueva sesión;
- segundo intento;
- tester excluded.

### Nota operativa (validación real, cierre de Sprint 1)

- Los E2E contra infraestructura externa real (Supabase real + PostHog EU real) deben ejecutarse con `--workers=1`. En paralelo (default 2 workers) aparecen timeouts de navegación por contención de red saliente contra los servicios reales, no por fallos de la aplicación (confirmado: mismo servidor, mismas pruebas, 8/8 en verde con `--workers=1`).
- Esto no cambia la configuración normal de los E2E con el driver `memory`: ahí no hay round-trip de red real y el paralelismo por defecto sigue siendo válido.
- `InMemoryExperimentRepository` sigue siendo el driver habitual para los tests (unitarios y E2E por defecto); el driver `supabase` es solo para validación puntual contra infraestructura real.
- Validación real superada: Supabase real, RLS real y PostHog EU real, todas confirmadas contra el proyecto real (no mocks).

### Nota operativa adicional (Sprint 2)

- La restricción de `--workers=1` no depende solo de `EXPERIMENT_DB_DRIVER=supabase`: mientras `NEXT_PUBLIC_POSTHOG_KEY` apunte a un proyecto PostHog EU real (necesario para que `tests/e2e/privacy.spec.ts` tenga payloads reales que inspeccionar), el navegador sigue haciendo peticiones de red reales a PostHog en cada test, incluso con `EXPERIMENT_DB_DRIVER=memory`. Confirmado de nuevo en Sprint 2: con el driver en memoria y 2 workers, 9-14 tests fallaban por timeout de navegación; con `--workers=1`, 14/14 en verde de forma repetible. Recomendación: ejecutar `npm run e2e -- --workers=1` mientras `.env.local` tenga una key de PostHog real.

---

# SPRINT 2 — ROUTER + ONBOARDING A/B

## Entregable

Todo el formulario hasta `onboarding_complete`.

### Construir

- router;
- problem;
- text;
- own profile;
- places;
- timezone;
- partner levels;
- persistence.

### Criterio

Journeys:

A full;

A unknown;

B full;

B partial;

B minimal/no viable.

### Riesgo

Geocoding/timezone.

### Tests

unit + integration + E2E.

### Nota operativa (cierre de Sprint 2)

- Geocoding: dataset local curado (`data/places/cities.json`, ~107 ciudades: España completa por provincia + capitales/ciudades principales de Latinoamérica y unas pocas ciudades globales), no GeoNames completo ni servicio externo. Ampliar cobertura es solo editar ese JSON.
- Timezone: cada ciudad del dataset lleva su IANA timezone ID embebido; no se usa ninguna librería de lookup por coordenadas (no hace falta con un catálogo cerrado).
- Formularios: sin React Hook Form (el resto del experimento tampoco lo usa); validación con Zod + estado local de React, igual que Sprint 1.
- Los 3 endpoints de onboarding (`/api/problem`, `/api/own-profile`, `/api/partner`) reciben todos los campos de su checkpoint en una sola llamada (contrato ya congelado en Sprint 0). La navegación de UI dentro de un checkpoint (ej. fecha → hora → lugar) es estado local de React: un refresh a mitad de un checkpoint vuelve al inicio de ese checkpoint (nunca pierde ni duplica lo que ya estaba persistido).
- Eventos backend (`own_profile_complete`, `partner_*`, `onboarding_complete`) se disparan desde el cliente inmediatamente después de recibir una respuesta 200 del endpoint correspondiente, no desde un cliente PostHog server-side (no existe `posthog-node` en este proyecto). Evita introducir esa infraestructura nueva mientras el patrón cliente-only siga siendo suficiente.
- Ver también la nota operativa adicional de Sprint 1 sobre `--workers=1` en E2E: aplica igual en Sprint 2 (depende de `NEXT_PUBLIC_POSTHOG_KEY`, no del driver de base de datos).

---

# SPRINT 3 — VEGA + OPENAI + PREVIEW

## Entregable

Preview end-to-end.

### Construir

- Vega client;
- API contracts;
- allowed evidence;
- OpenAI Responses API;
- Structured Outputs;
- schema validator;
- retry;
- safety;
- partner deletion.

### Criterio

Ningún factor ajeno a Vega puede alcanzar UI.

### Riesgo

Calidad y latencia.

### Tests

hallucinated ID must fail.

---

# SPRINT 4 — PAYWALL + INTENT + WAITLIST

## Entregable

Funnel comercial completo.

### Construir

- preview UI;
- paywall;
- priced CTA;
- intent DB;
- beta;
- email;
- n8n;
- Resend.

### Criterio

Doble clic produce un único intent.

n8n caído no pierde waitlist.

### Riesgo

Eventos duplicados.

### Tests

idempotencia.

---

# SPRINT 5 — QA + DASHBOARDS + DEPLOY

## Entregable

Sistema preparado para tráfico real.

### Construir

- 40 QA previews;
- scoring;
- dashboards;
- Meta PageView;
- UTM validation;
- Vercel;
- dominio;
- privacy cleanup jobs;
- full E2E production smoke test.

### Criterio

Checklist Fase 4C completa.

### Riesgo

QA A/B desigual.

### Test

producción con tráfico interno excluido.

---

# 69. CI/CD

GitHub:

```text
pull request
  ↓
lint
  ↓
typecheck
  ↓
unit tests
  ↓
integration tests
  ↓
build
  ↓
Playwright critical paths

```

Merge main:

→ Vercel production.

---

# 70. OPENAI — COSTE

Para el experimento no necesitamos Sol.

Primera opción:

**GPT-5.6 Luna.**

Precio actual:

- input: $0,20 / 1M tokens;
- output: $1,20 / 1M tokens.

Supongamos por preview:

```text
2.000 input tokens
300 output tokens

```

Coste aproximado:

```text
input:
2,000 / 1,000,000 × $0.20
≈ $0.00040

output:
300 / 1,000,000 × $1.20
≈ $0.00036

total:
≈ $0.00076 / preview

```

Mil previews:

≈ **$0,76**.

Con retries/margen del 20%:

≈ **$0,91 por 1.000 previews**.

Si QA obliga a Terra, el mismo supuesto sería aproximadamente diez veces superior, en torno a **$7,60/1.000 previews** antes de retries, porque Terra cuesta actualmente $2/M input y $12/M output.

El coste del LLM es irrelevante frente al coste de adquisición.

---

# 71. SUPABASE — COSTE

## Free

Actualmente:

- 500 MB database;
- 50.000 MAU;
- 5 GB egress;
- $0/mes.

Pero los proyectos gratuitos pueden pausarse tras una semana de inactividad.

## Pro

Desde:

**$25/mes**.

Incluye además backups diarios y no se pausa.

### Recomendación

Durante desarrollo:

**Free.**

Justo antes de tráfico:

tienes dos opciones:

- mantener Free si habrá actividad diaria;
- Pro si quieres reducir riesgo operativo.

Para un experimento pagado de 500 € de tráfico, personalmente presupuestaría **Pro = $25**.

---

# 72. POSTHOG — COSTE

A nuestro volumen:

**$0 esperado.**

La capa gratuita actual cubre:

- 1M analytics events/mes;
- 5.000 session replay/mes.

Y propongo no utilizar replay inicialmente.

---

# 73. VERCEL

### Pro

$20/mes actualmente.

Coste esperado experimento:

**$20**.

---

# 74. GEOCODING

Con catálogo local:

### coste variable:

**$0**.

Coste técnico:

descargar/cargar dataset.

---

# 75. EMAIL

Resend Free:

hasta 3.000 emails mensuales / 100 diarios actualmente.

Coste esperado:

**$0**.

---

# 76. N8N

Si ya utilizas n8n Cloud:

coste incremental del experimento:

**\~0** dentro de tu plan existente.

No contabilizo el coste de una suscripción ya contratada como coste marginal.

---

# 77. DOMINIO

Si ya existe dominio/subdominio:

**0 incremental.**

Recomendaría algo como:

```text
vega.tudominio.com

```

No comprar dominio específico hasta validar.

---

# 78. COSTE TÉCNICO FIJO RECOMENDADO

Con stack prudente:

| ConceptoAproximado |                         |
| ------------------ | ----------------------- |
| Vercel Pro         | $20/mes                 |
| Supabase Pro       | $25/mes                 |
| PostHog            | $0                      |
| Email              | $0                      |
| Geocoding          | $0                      |
| OpenAI base        | variable                |
| Dominio adicional  | $0 si usamos subdominio |
| **TOTAL FIJO**     | **≈ $45/mes**           |

Se puede reducir hasta aproximadamente:

**$20/mes**

usando Supabase Free.

---

# 79. COSTE VARIABLE POR USUARIO

El coste dominante será OpenAI.

Si sólo quienes terminan onboarding generan preview:

### Luna

aproximadamente:

**$0,00076/preview** bajo el supuesto anterior.

Motor Vega:

dependerá de dónde esté alojado actualmente.

Supabase/PostHog:

prácticamente 0 marginal a este volumen.

---

# 80. COSTE TÉCNICO TOTAL PROBABLE

Para 500–1.000 usuarios experimentales:

### Infraestructura prudente

≈ **$45–50 durante el mes de prueba**

más el coste existente del motor Vega/n8n.

### LLM

probablemente:

**< $1–2** con Luna para las previews del experimento.

Es decir:

> **la infraestructura técnica no debería ser el cuello de botella económico.**

El gasto relevante será tráfico.

---

# 81. DECISIONES TÉCNICAS QUE QUEDAN FIJADAS

### Frontend/backend

Next.js App Router.

### Hosting

Vercel Pro.

### DB

Supabase PostgreSQL.

### Acceso DB

Sólo servidor para tablas sensibles.

### Analytics

PostHog EU.

### Formularios

React Hook Form + Zod.

### Place lookup

dataset local de ciudades.

### Timezone

IANA timezone + resolución histórica en motor.

### Motor astrológico

Vega API.

### Interpretación

OpenAI Responses API + Structured Outputs.

### Modelo inicial

configurable; comenzar QA con `gpt-5.6-luna`.

### Automatización

Supabase → n8n → email.

### E2E

Playwright.

### Unit

Vitest.

### Pricing

sólo fake door 9,99 €.

### Pago

ninguno.

---

# 82. DEFINICIÓN GLOBAL DE DONE

El sistema estará técnicamente preparado para recibir tráfico cuando un usuario real pueda completar:

```text
Meta
↓
Landing neutral
↓
Router
↓
A o B
↓
Problema
↓
Datos
↓
Motor Vega
↓
OpenAI
↓
Preview válida
↓
9,99 €
↓
Priced access intent
↓
Waitlist
↓
Email

```

y simultáneamente podamos demostrar que:

### Seguridad

ningún secreto llega al navegador.

### Privacidad

ningún dato sensible llega a PostHog o Meta.

### Astrología

ningún cálculo procede del LLM.

### Calidad

ningún factor no autorizado aparece en preview.

### Analytics

cada evento crítico ocurre exactamente una vez.

### Resiliencia

n8n/email puede fallar sin perder el lead.

### Experimentación

un refresh no altera segmento, progreso ni contadores.

### QA

A y B superan la rúbrica con diferencia ≤0,25.

### Limpieza

datos brutos de partner desaparecen inmediatamente tras derivación o, como máximo, en 1 hora (reducido desde 24 horas el 2026-10-07; hasta ~2 horas reales por la cadencia horaria del cron de limpieza).

### Medición

podemos calcular sin trabajo manual:

```text
segment_selected / router_view

own_profile_complete / segment_entry

priced_access_intent / paywall_view

priced_access_intent / segment_entry

onboarding_complete / onboarding_start

partner_analysis_possible / partner_data_start

```

Sólo entonces el experimento recibe:

# GO PARA TRÁFICO

---

# 83. CANAL DE EJERCICIO DE DERECHOS (BETA)

### Implementación técnica del canal de derechos: CERRADA.

Implementado y validado con la suite completa en verde (unitarios +
integración + lint + typecheck + build). Sin SQL ni migraciones nuevas:
los 5 métodos de repositorio añadidos (`listFlowAttemptsForUser`,
`deleteProblemContext`, `deleteOwnBirthProfile`,
`deletePreviewsForFlowAttempt`, `deleteWaitlistEntry`) operan sobre
tablas y columnas ya existentes.

### Endpoints

- `GET /api/privacy/summary` — devuelve un **resumen de datos asociados
  a la sesión actual**, no el contenido en bruto completo: existencia
  por categoría y metadatos técnicos (fechas, flags), nunca texto libre
  ni fecha/hora/lugar de nacimiento, salvo el email de waitlist (el
  propio dato de contacto del usuario, sobre su propia sesión ya
  verificada).
- `POST /api/privacy/delete-all` — borra, en una sola solicitud
  autenticada, el núcleo purgable de todos los `flow_attempts` del
  usuario (`problem_context`, `partner_input`, `partner_derived_profile`,
  todas las `previews`) más la entrada de `waitlist` si existe, y una
  vez, `user_birth_profile`. Solo al final invalida las cookies de
  sesión.
- `POST /api/privacy/delete-waitlist` — acción independiente: borra
  únicamente la entrada de `waitlist`, sin invalidar ninguna cookie ni
  afectar al resto del flujo. Idempotente.

### Verificación de identidad

La identidad se verifica **únicamente** mediante `vega_session` (la
credencial httpOnly firmada, `libs/experiment/session-credential.ts`) —
nunca mediante `vega_auid` ni ningún identificador recibido en el cuerpo
de la petición. Sin `vega_session` válida, ambos endpoints devuelven
`401` antes de tocar ningún dato.

### Invalidación de sesión tras `delete-all`

Después del borrado, `delete-all` invalida `vega_session`, `vega_auid` y
`vega_attempt`. **`vega_test` no se toca** — el tráfico de prueba sigue
operativo con la identidad nueva que se mine después. Esta invalidación
es lo que impide reabrir el `flow_attempt` antiguo, generar una preview
de error automática, o llegar al paywall antiguo — sin necesidad de
resetear `current_step`, `trigger` ni `partner_precision`.

### Qué NO se elimina

`experiment_users`, `flow_attempts` (ni sus columnas `current_step`,
`trigger`, `partner_precision`, `completed_at`) ni `priced_access_intents`
— sin cambios respecto a lo ya documentado en la sección 11.

### UI

`/mis-datos` existe y está operativa, pero **todavía no está enlazada**
desde la política de privacidad pública ni desde ningún footer — solo
accesible por URL directa.

### Logging

No existe ningún logging específico nuevo de estas solicitudes (ni
`console.info`, ni evento de PostHog, ni tabla de auditoría) — decisión
explícita para esta beta.

### Pendientes jurídicos (no resueltos por esta implementación)

Lo anterior es exclusivamente el estado técnico. Quedan abiertos,
pendientes de asesoría externa, sin que esta implementación los dé por
resueltos:

- si una sesión firmada (`vega_session`) es una verificación de
  identidad jurídicamente suficiente para atender una solicitud de
  derechos;
- si el resumen de `/api/privacy/summary` es, por sí solo, un mecanismo
  formal suficiente de ejercicio del derecho de acceso del RGPD;
- cómo debe tratarse una solicitud de derechos cuando no hay sesión viva
  (hoy, puramente manual, sin canal automatizado);
- cómo debe poder ejercer sus derechos la segunda persona del segmento B,
  cuyos datos introduce el usuario pero que no tiene sesión ni acceso
  propio al sistema (ver `VEGA_Segmento_B_Revision_Juridica_v1.md`);
- la identidad y el email de contacto del responsable efectivo del
  tratamiento, todavía pendientes de decisión.