-- VEGA Sprint 1 — persistencia experimental minima.
-- Fuente: VEGA_Plan_Tecnico_Implementacion_Experimento.md, secciones 8-9.
--
-- Alcance deliberado de Sprint 1: solo experiment_users y flow_attempts.
-- El resto de tablas del modelo completo (problem_context, user_birth_profile,
-- partner_input, previews, waitlist, ...) se anaden en sprints posteriores,
-- cuando ese dato exista realmente en el producto.

create extension if not exists pgcrypto;

create table if not exists public.experiment_users (
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

create index if not exists idx_experiment_users_experiment
    on public.experiment_users(experiment_id);

create index if not exists idx_experiment_users_test
    on public.experiment_users(is_test);

create table if not exists public.flow_attempts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.experiment_users(id)
        on delete cascade,

    segment text not null
        check (segment in ('A', 'B')),

    trigger text,
    current_step text,

    partner_precision text
        check (
            partner_precision is null or
            partner_precision in ('full', 'partial', 'minimal')
        ),

    is_primary_attempt boolean not null default true,

    started_at timestamptz not null default now(),
    completed_at timestamptz
);

create index if not exists idx_flow_attempts_user
    on public.flow_attempts(user_id);

create index if not exists idx_flow_attempts_segment
    on public.flow_attempts(segment);

-- Un unico intento primario por usuario. Esta es la garantia de fuente
-- de verdad: cualquier intento posterior debe insertarse con
-- is_primary_attempt = false, y la base de datos rechaza la alternativa.
create unique index if not exists only_one_primary_attempt
    on public.flow_attempts(user_id)
    where is_primary_attempt = true;

-- RLS + revocacion de grants. El navegador nunca consulta estas tablas
-- directamente (ni con anon key ni autenticado): todo pasa por el
-- backend con la service role key. No se crean policies para anon a
-- proposito (VEGA_Plan_Tecnico, seccion 9).
alter table public.experiment_users enable row level security;
alter table public.flow_attempts enable row level security;

revoke all on public.experiment_users from anon, authenticated;
revoke all on public.flow_attempts from anon, authenticated;
