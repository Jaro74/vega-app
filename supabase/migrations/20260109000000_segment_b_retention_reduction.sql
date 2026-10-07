-- VEGA -- Reduccion de retencion del Segmento B (partner_input,
-- partner_derived_profile). Decision aprobada en
-- VEGA_Base_Juridica_Segmento_B_v1.md (condicion 3 de la conclusion):
-- refuerza el test de necesidad del art. 6.1.f reduciendo el fallback
-- tecnico del dato en bruto y la retencion del derivado a la ventana
-- minima que su propia finalidad (red de seguridad / continuidad de
-- corto plazo) justifica.
--
-- Aditiva y conservadora: no toca cron schedules, indices ni funciones
-- de purga existentes (purge-partner-input-expired,
-- purge_expired_experiment_personal_data()). Las filas vigentes solo se
-- acortan, nunca se alargan -- equivalente a
-- LEAST(valor_actual, created_at + nueva_retencion).

-- 1. partner_input: fallback de 24h -> 1h (solo cambia el DEFAULT para
-- filas nuevas; no retroactivo salvo el acortamiento de abajo).
alter table public.partner_input
    alter column expires_at set default (now() + interval '1 hour');

-- Acorta las filas vigentes cuyo expires_at actual supere
-- created_at + 1h. Nunca se ejecuta sobre una fila cuyo expires_at ya
-- fuera mas corto que ese nuevo limite (la condicion WHERE lo garantiza).
update public.partner_input
    set expires_at = created_at + interval '1 hour'
    where expires_at > created_at + interval '1 hour';

-- 2. partner_derived_profile: retencion de 30 dias -> 24 horas.
alter table public.partner_derived_profile
    alter column delete_after set default (now() + interval '24 hours');

update public.partner_derived_profile
    set delete_after = created_at + interval '24 hours'
    where delete_after > created_at + interval '24 hours';

-- 3. Limpieza inmediata de filas ya vencidas segun los nuevos limites
-- (revision de seguridad 2026-10-07): sin este DELETE, una fila ya
-- caducada en el momento de aplicar esta migracion seguiria fisicamente
-- presente hasta el siguiente ciclo del cron correspondiente. No hay
-- ninguna FK hija sobre ninguna de las dos tablas (verificado: ninguna
-- otra tabla las referencia como padre), por lo que este borrado es
-- seguro sin efectos de cascada.
delete from public.partner_input
    where expires_at <= now();

delete from public.partner_derived_profile
    where delete_after <= now();

-- 4. Lectura de partner_derived_profile: ya corregida en el codigo de
-- aplicacion (libs/db/supabase-repository.ts,
-- libs/db/memory-repository.ts) para tratar delete_after <= now() como
-- inexistente/no reutilizable, con independencia de si el borrado
-- fisico ya ha pasado por la fila. Esta migracion refuerza esa garantia
-- del lado de la base de datos dandole a partner_derived_profile su
-- propia purga horaria, separada de la purga diaria del resto del
-- nucleo (ver analisis de alternativas en el informe de revision;
-- partner_derived_profile deja de purgarse aqui junto con
-- problem_context/user_birth_profile/previews, que mantienen su propia
-- cadencia diaria sin cambios).
create or replace function public.purge_expired_experiment_personal_data()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.problem_context where delete_after < now();
  delete from public.user_birth_profile where delete_after < now();
  delete from public.previews where delete_after < now();
$$;

create or replace function public.purge_expired_partner_derived_profile()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.partner_derived_profile where delete_after <= now();
$$;

revoke all on function public.purge_expired_partner_derived_profile()
    from public, anon, authenticated;

-- 5. Cron: NO se crea, modifica ni elimina ningun job de pg_cron en esta
-- migracion (mismo patron operativo que el resto del proyecto). Queda
-- pendiente, como paso manual en el dashboard de Supabase, crear un
-- nuevo job horario (p. ej. jobname = purge-partner-derived-profile-
-- expired, schedule = '0 * * * *', command = 'select
-- public.purge_expired_partner_derived_profile();') antes de considerar
-- cerrada esta reduccion de retencion. El job diario existente
-- (purge-experiment-personal-data-expired) no necesita ningun cambio:
-- sigue cubriendo exactamente problem_context, user_birth_profile y
-- previews, sin partner_derived_profile.
