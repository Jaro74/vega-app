-- VEGA -- Retencion automatica de waitlist.
-- Fuente: documentacion/VEGA_Decision_Retencion_Waitlist_v1.md, seccion 4
-- ("Plazo de conservacion" -- regla general: 12 meses desde el alta) y
-- documentacion/VEGA_Politica_Privacidad_Beta_v1.md, seccion 5. Aditiva:
-- no toca ninguna tabla de Sprint 1/2/3A/3B/4.
--
-- El job de limpieza (purge-waitlist-expired) NO se crea aqui: se
-- configura aparte, manualmente en Supabase (pg_cron), con su propia
-- verificacion -- mismo patron operativo que ya usa partner_input/
-- partner_derived_profile (VEGA_Plan_Tecnico_Implementacion_Experimento.md,
-- seccion 11: la query de limpieza esta documentada, pero el job en si se
-- programa directamente en el dashboard, nunca en una migracion).

-- Se añade primero como nullable: un DEFAULT aplicado directamente via
-- ADD COLUMN estamparia el MISMO now()+12 meses a todas las filas ya
-- existentes, no su propio created_at+12 meses -- por eso el backfill va
-- aparte, antes de fijar NOT NULL/DEFAULT para las filas nuevas.
alter table public.waitlist
    add column if not exists expires_at timestamptz;

update public.waitlist
    set expires_at = created_at + interval '12 months'
    where expires_at is null;

alter table public.waitlist
    alter column expires_at set not null,
    alter column expires_at set default (now() + interval '12 months');

create index if not exists idx_waitlist_expires
    on public.waitlist(expires_at);

-- security definer + search_path fijado (evita hijacking de search_path):
-- primera funcion de este tipo en el repositorio, no hay una previa sobre
-- la que calcar este patron.
create or replace function public.purge_expired_waitlist_entries()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.waitlist where expires_at < now();
$$;

revoke all on function public.purge_expired_waitlist_entries() from public, anon, authenticated;
