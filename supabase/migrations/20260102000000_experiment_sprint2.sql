-- VEGA Sprint 2 — router + onboarding A/B.
-- Fuente: VEGA_Plan_Tecnico_Implementacion_Experimento.md, secciones 8-9.
--
-- Alcance deliberado de Sprint 2: problem_context, user_birth_profile y
-- partner_input (el minimo exigido por el encargo). previews, waitlist,
-- priced_access_intents y partner_derived_profile llegan cuando el
-- producto que las necesita (Vega/OpenAI, paywall) exista de verdad.

create table if not exists public.problem_context (
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

-- Texto libre sensible (VEGA_Fase_4C, seccion W): nunca se expone al
-- cliente ni a PostHog, solo se persiste aqui. Retencion prevista: 30
-- dias tras el cierre del experimento (gestion manual/futuro job, fuera
-- de alcance de Sprint 2).

create table if not exists public.user_birth_profile (
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

-- Temporal por diseno (VEGA_Fase_4C, seccion W): la derivacion y el
-- borrado automatico tras el calculo del motor Vega llegan en Sprint 3,
-- cuando el propio calculo exista. expires_at ya se fija aqui (defensa
-- por defecto de 24h) para que ese borrado, cuando se implemente, no
-- dependa de una migracion adicional.
create table if not exists public.partner_input (
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

create index if not exists idx_problem_context_flow_attempt
    on public.problem_context(flow_attempt_id);

create index if not exists idx_user_birth_profile_user
    on public.user_birth_profile(user_id);

create index if not exists idx_partner_input_flow_attempt
    on public.partner_input(flow_attempt_id);

create index if not exists idx_partner_input_expires
    on public.partner_input(expires_at);

-- RLS + revocacion de grants, mismo patron que Sprint 1: el navegador
-- nunca consulta estas tablas directamente, todo pasa por el backend con
-- la service role key.
alter table public.problem_context enable row level security;
alter table public.user_birth_profile enable row level security;
alter table public.partner_input enable row level security;

revoke all on public.problem_context from anon, authenticated;
revoke all on public.user_birth_profile from anon, authenticated;
revoke all on public.partner_input from anon, authenticated;
