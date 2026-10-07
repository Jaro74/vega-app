-- VEGA -- Retencion de priced_access_intents (red de seguridad de 12
-- meses). Fuente: decision de retencion aprobada 2026-10-04.
--
-- Politica acordada: priced_access_intents se conserva durante el
-- experimento -- es la fuente granular de la conversion
-- priced_access_intent, necesaria para la metrica principal del
-- experimento (no cubierta de forma granular por ninguna otra tabla).
-- No entra en la politica general de 30 dias
-- (purge_expired_experiment_personal_data, migracion
-- 20260107000000) -- aditiva, no la modifica. Al cierre y analisis del
-- experimento, la intencion es eliminar estos registros manualmente
-- cuando ya no sean necesarios (procedimiento documentado aparte, no
-- en esta migracion). Como red de seguridad frente a una conservacion
-- indefinida si ese borrado manual no llega a ejecutarse, existe un
-- limite maximo automatico de 12 meses desde created_at -- mismo
-- patron que waitlist.expires_at
-- (20260106000000_experiment_waitlist_retention.sql), de ahi el mismo
-- nombre de columna (expires_at, no delete_after: esa columna queda
-- reservada en este proyecto para el nucleo de 30 dias).

alter table public.priced_access_intents
    add column if not exists expires_at timestamptz;

update public.priced_access_intents
    set expires_at = created_at + interval '12 months'
    where expires_at is null;

alter table public.priced_access_intents
    alter column expires_at set not null,
    alter column expires_at set default (now() + interval '12 months');

create index if not exists idx_priced_access_intents_expires
    on public.priced_access_intents(expires_at);

-- Funcion separada a proposito de purge_expired_experiment_personal_data()
-- (que esta migracion NO modifica): priced_access_intents tiene una
-- politica y un ciclo de vida conceptualmente distintos (12 meses de
-- red de seguridad + borrado manual al cierre, no 30 dias automaticos
-- sin excepcion). Mismo patron que las funciones ya existentes:
-- security definer + search_path fijo + grants revocados.
create or replace function public.purge_expired_priced_access_intents()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.priced_access_intents where expires_at < now();
$$;

revoke all on function public.purge_expired_priced_access_intents()
    from public, anon, authenticated;

-- Ningun pg_cron se crea ni modifica en esta migracion. El job
-- "purge-priced-access-intents-expired" (0 3 * * *) se configura
-- aparte, manualmente, en el dashboard de Supabase -- mismo patron
-- operativo que partner_input/waitlist/el nucleo de 30 dias.
