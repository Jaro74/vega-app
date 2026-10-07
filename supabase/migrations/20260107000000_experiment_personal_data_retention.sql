-- VEGA -- Retencion de 30 dias para el nucleo de datos personales del
-- experimento: problem_context, user_birth_profile, previews y
-- partner_derived_profile. Fuente: decision de retencion aprobada
-- 2026-10-04. partner_input mantiene su comportamiento actual (borrado
-- inmediato tras derivacion + 24h de seguridad, cron
-- purge-partner-input-expired sin cambios); waitlist mantiene 12 meses
-- (cron purge-waitlist-expired sin cambios); priced_access_intents
-- queda fuera de esta purga, retencion pendiente de decidir aparte.
--
-- Aditiva: no toca experiment_users, flow_attempts,
-- priced_access_intents, partner_input ni waitlist. partner_input y
-- partner_derived_profile ya tenian sus propias columnas de expiracion
-- desde Sprint 2/3B y no se modifican aqui -- partner_derived_profile
-- solo se incorpora a la NUEVA funcion de purga de mas abajo (el cron
-- purge-partner-derived-profile-expired, que hoy ejecuta DELETE directo
-- sin funcion con nombre, se sustituira aparte, manualmente, por otro
-- que llame a esta funcion -- fuera de alcance de esta migracion).

-- 1-3. user_birth_profile: columna nueva, nullable primero (mismo motivo
-- ya documentado en 20260106000000_experiment_waitlist_retention.sql:
-- un DEFAULT aplicado directamente via ADD COLUMN estamparia el MISMO
-- now()+30d a todas las filas existentes, no su propio created_at+30d).
alter table public.user_birth_profile
    add column if not exists delete_after timestamptz;

update public.user_birth_profile
    set delete_after = created_at + interval '30 days'
    where delete_after is null;

alter table public.user_birth_profile
    alter column delete_after set not null,
    alter column delete_after set default (now() + interval '30 days');

create index if not exists idx_user_birth_profile_delete_after
    on public.user_birth_profile(delete_after);

-- 4. problem_context: la columna ya existe (nullable, nunca rellenada
-- por el codigo de aplicacion -- libs/experiment/onboarding-service.ts
-- no la incluye en el upsert). Mismo patron de backfill.
update public.problem_context
    set delete_after = created_at + interval '30 days'
    where delete_after is null;

alter table public.problem_context
    alter column delete_after set not null,
    alter column delete_after set default (now() + interval '30 days');

create index if not exists idx_problem_context_delete_after
    on public.problem_context(delete_after);

-- 5. previews: columna nueva, mismo patron. Insert-only por diseno
-- (preview-service.ts/synastry-preview-service.ts nunca actualizan una
-- fila existente), asi que el backfill por created_at no tiene ningun
-- riesgo de "drift" por upsert posterior.
alter table public.previews
    add column if not exists delete_after timestamptz;

update public.previews
    set delete_after = created_at + interval '30 days'
    where delete_after is null;

alter table public.previews
    alter column delete_after set not null,
    alter column delete_after set default (now() + interval '30 days');

create index if not exists idx_previews_delete_after
    on public.previews(delete_after);

-- 6-7. partner_input y partner_derived_profile: sin cambios de esquema,
-- a proposito -- expires_at / delete_after ya existian y ya son
-- correctos desde Sprint 2/3B. partner_derived_profile ya tiene
-- idx_partner_derived_profile_delete_after (Sprint 3B); no se recrea.

-- 8. (ver indices creados junto a cada columna, arriba).

-- 9-11. Funcion de purga consolidada: borra UNICAMENTE estas 4 tablas,
-- siempre por su propio timestamp, nunca via flow_attempts ni
-- experiment_users (borrar el padre cascadearia sobre waitlist/
-- priced_access_intents sin importar su propia antiguedad, por el ON
-- DELETE CASCADE de ambas hacia flow_attempts). Mismo patron que la
-- funcion ya existente de waitlist: security definer + search_path
-- fijo + grants revocados. Ninguna de las 4 tablas de abajo es
-- referenciada por otra via FK (ninguna es padre de nada), asi que el
-- orden entre los 4 DELETE es indiferente para la integridad.
create or replace function public.purge_expired_experiment_personal_data()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.partner_derived_profile where delete_after < now();
  delete from public.problem_context where delete_after < now();
  delete from public.user_birth_profile where delete_after < now();
  delete from public.previews where delete_after < now();
$$;

revoke all on function public.purge_expired_experiment_personal_data()
    from public, anon, authenticated;

-- 12. Ningun pg_cron se crea, modifica ni elimina en esta migracion.
-- purge-partner-input-expired y purge-waitlist-expired quedan
-- exactamente igual. La sustitucion de purge-partner-derived-profile-
-- expired por un job que llame a esta funcion se hace aparte,
-- manualmente, en el dashboard de Supabase.
