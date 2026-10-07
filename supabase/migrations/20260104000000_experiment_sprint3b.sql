-- VEGA Sprint 3B — Sinastria + preview B (segmento B).
-- Fuente: VEGA_Plan_Tecnico_Implementacion_Experimento.md, seccion 8
-- ("partner_derived_profile", tabla que el plan original ya prevela para
-- este sprint) y seccion 11 ("ELIMINACION AUTOMATICA PARTNER"); contrato
-- real de POST /evidence/synastry verificado contra Railway (gate
-- Sprint 3B). Aditiva: no toca las tablas de Sprint 1/2/3A salvo por
-- las columnas nuevas de "previews", necesarias para persistir preview B
-- con la misma trazabilidad tecnica que ya tiene preview A.

-- Cache de la evidencia de sinastria ya validada por Vega para un
-- flow_attempt (nunca datos brutos de nacimiento): permite (a)
-- idempotencia de "insufficient_data" sin repetir la llamada a Vega y
-- (b) reintentar tras un fallo de OpenAI sin volver a llamar a Vega,
-- incluso despues de que partner_input ya se haya borrado.
create table if not exists public.partner_derived_profile (
    id uuid primary key default gen_random_uuid(),

    flow_attempt_id uuid not null unique
        references public.flow_attempts(id)
        on delete cascade,

    partner_precision text not null
        check (
          partner_precision in ('full','partial','minimal')
        ),

    synastry_status text not null
        check (
          synastry_status in ('ok','insufficient_data')
        ),

    -- Solo evidencia ya validada por Vega (IDs, subject, payload,
    -- versiones, chart_id_a/b) o, si synastry_status='insufficient_data',
    -- el motivo y los participantes insuficientes. Nunca fecha, hora,
    -- lugar ni coordenadas de ninguna de las dos personas.
    derived_features jsonb not null,

    created_at timestamptz not null default now(),

    -- Retencion mas larga que partner_input (24h) porque esto ya no son
    -- datos brutos, solo evidencia astral derivada (aspectos entre
    -- cuerpos), pero sigue conteniendo chart_id_b (huella de los datos de
    -- la otra persona) y por tanto no debe conservarse indefinidamente.
    -- 30 dias es un valor de partida documentado para el experimento,
    -- pendiente de revision legal antes de cualquier uso comercial
    -- (VEGA_Fase_4C, seccion W).
    delete_after timestamptz not null default (now() + interval '30 days')
);

create index if not exists idx_partner_derived_profile_delete_after
    on public.partner_derived_profile(delete_after);

alter table public.partner_derived_profile enable row level security;

revoke all on public.partner_derived_profile from anon, authenticated;

-- Extiende "previews" (creada en Sprint 3A) para poder persistir preview
-- B con la misma trazabilidad tecnica que preview A ya tiene. chart_id/
-- time_known (columnas ya existentes) son siempre de la persona A en
-- ambos segmentos; las columnas *_b y syn_* solo se rellenan en filas de
-- segmento B.
alter table public.previews
    add column if not exists chart_id_b text,
    add column if not exists synastry_facts_version text,
    add column if not exists synastry_claims_version text,
    add column if not exists synastry_evidence_schema_version text,
    add column if not exists time_known_b boolean;

-- "insufficient_data" (Sprint 3B): resultado de dominio propio de B
-- cuando Vega no puede construir una sinastria fiable. No es un error
-- tecnico -- OpenAI nunca llega a invocarse -- por eso es un valor mas de
-- generation_status, no una fila con generation_status='error'.
alter table public.previews
    drop constraint if exists previews_generation_status_check;

alter table public.previews
    add constraint previews_generation_status_check
    check (
      generation_status in ('valid','invalid','error','insufficient_data')
    );
