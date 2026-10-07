-- VEGA Sprint 3A — Vega natal evidence + OpenAI preview (segmento A).
-- Fuente: VEGA_Plan_Tecnico_Implementacion_Experimento.md, seccion 8
-- (tabla "previews"), extendida con las columnas que exige el contrato
-- definitivo de POST /evidence/natal (chart_id, versiones de evidence,
-- time_known, IDs de evidencia usados): ese contrato no existia todavia
-- cuando se escribio el plan original, por lo que esta migracion añade
-- esas columnas ademas de las ya previstas. Aditiva, no toca las tablas
-- de Sprint 1/2.
--
-- Alcance deliberado de Sprint 3A: solo la tabla "previews". Las tablas
-- de paywall/waitlist (priced_access_intents, waitlist) llegan en
-- Sprint 4; partner_derived_profile llega con Sprint 3B (sinastria).

create table if not exists public.previews (
    id uuid primary key default gen_random_uuid(),

    flow_attempt_id uuid not null
        references public.flow_attempts(id)
        on delete cascade,

    schema_version text not null default 'preview_v1',
    prompt_version text not null,
    model_id text,

    partner_precision text
        check (
          partner_precision is null or
          partner_precision in ('full','partial','minimal')
        ),

    chart_id text,
    evidence_schema_version text,
    facts_version text,
    claims_version text,
    time_known boolean,
    evidence_ids_used jsonb not null default '[]'::jsonb,

    preview_json jsonb,

    generation_status text not null
        check (
          generation_status in ('valid','invalid','error')
        ),
    error_type text,

    latency_ms integer,

    created_at timestamptz not null default now()
);

create index if not exists idx_previews_flow_attempt
    on public.previews(flow_attempt_id);

create index if not exists idx_previews_status
    on public.previews(generation_status);

-- RLS + revocacion de grants, mismo patron que Sprint 1/2: el navegador
-- nunca consulta esta tabla directamente, todo pasa por el backend con
-- la service role key.
alter table public.previews enable row level security;

revoke all on public.previews from anon, authenticated;
