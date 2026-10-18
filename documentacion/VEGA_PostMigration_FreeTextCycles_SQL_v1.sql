-- VEGA -- POST-MIGRATION VERIFICATION para
-- 20260112000000_free_text_consent_cycles.sql
--
-- 100% SOLO LECTURA. No contiene ningun INSERT/UPDATE/DELETE/ALTER/
-- CREATE/DROP/GRANT/REVOKE/TRUNCATE ni llamada a funcion que modifique
-- datos. NO EJECUTAR todavia -- preparado para correrlo manualmente
-- justo despues de aplicar la migracion contra Supabase. Comparar el
-- "total de eventos" del punto 9 contra el mismo numero ya capturado
-- con VEGA_Preflight_FreeTextCycles_SQL_v1.sql (seccion 4) antes de
-- aplicar -- deben coincidir exactamente (el backfill solo lee e
-- inserta en free_text_consent_cycles, nunca modifica
-- free_text_consent_events).

-- =====================================================================
-- 1. Backfill completo: cero granted sin ciclo asociado.
-- =====================================================================
select e.seq, e.flow_attempt_id
from public.free_text_consent_events e
where e.action = 'granted'
  and not exists (
      select 1 from public.free_text_consent_cycles c where c.opened_seq = e.seq
  );

-- =====================================================================
-- 2. Cero terminales sin ciclo asociado.
-- =====================================================================
select e.seq, e.flow_attempt_id, e.action
from public.free_text_consent_events e
where e.action in ('withdrawn', 'expired', 'erasure_requested')
  and not exists (
      select 1 from public.free_text_consent_cycles c where c.closed_seq = e.seq
  );

-- =====================================================================
-- 3. Cero ciclos solapados para el mismo flow_attempt_id.
-- =====================================================================
select c1.flow_attempt_id, c1.id as cycle_a, c2.id as cycle_b
from public.free_text_consent_cycles c1
join public.free_text_consent_cycles c2
  on c1.flow_attempt_id = c2.flow_attempt_id
 and c1.id <> c2.id
 and c1.opened_seq < c2.opened_seq
 and (c1.closed_seq is null or c1.closed_seq > c2.opened_seq);

-- =====================================================================
-- 4. Como maximo un ciclo abierto activo por flow_attempt_id (deberia
--    devolver cero filas -- si devuelve alguna, el indice unico parcial
--    no esta haciendo su trabajo o no se creo correctamente).
-- =====================================================================
select flow_attempt_id, count(*) as ciclos_abiertos_activos
from public.free_text_consent_cycles
where lifecycle_state = 'active' and closed_seq is null
group by flow_attempt_id
having count(*) > 1;

-- =====================================================================
-- 5. Constraints presentes en free_text_consent_cycles -- se esperan
--    exactamente estos 7 CHECK con nombre, mas la PK y las 3 FK
--    (flow_attempt_id, opened_seq, closed_seq).
-- =====================================================================
select conname, contype, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.free_text_consent_cycles'::regclass
order by contype, conname;

-- Lista de verificacion manual contra el resultado anterior:
--   free_text_consent_cycles_closure_consistency
--   free_text_consent_cycles_blocked_has_timestamp
--   free_text_consent_cycles_blocked_requires_closed_cycle
--   free_text_consent_cycles_hold_requires_closed_cycle
--   free_text_consent_cycles_hold_active_has_timestamp
--   free_text_consent_cycles_hold_released_implies_held
--   free_text_consent_cycles_hold_not_active_and_released
--   free_text_consent_cycles_pkey
--   free_text_consent_cycles_opened_seq_key (unique)
--   free_text_consent_cycles_closed_seq_key (unique)
--   + 3 foreign keys (flow_attempt_id, opened_seq, closed_seq)

-- =====================================================================
-- 6. FK RESTRICT -- confirma delete_rule = 'RESTRICT' en la columna
--    flow_attempt_id de free_text_consent_events (ya estaba asi antes
--    de esta migracion, que no la toca) y de free_text_consent_cycles
--    (nueva). Filtra explicitamente por kcu.column_name =
--    'flow_attempt_id': ambas tablas tienen otras FK propias
--    (consent_version en free_text_consent_events; opened_seq y
--    closed_seq en free_text_consent_cycles) y un filtro que no
--    distinga por columna local mezclaria su delete_rule con el de
--    flow_attempt_id en el mismo resultado.
-- =====================================================================
select
    tc.table_name,
    tc.constraint_name,
    kcu.column_name as local_column,
    rc.delete_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name and tc.constraint_schema = kcu.constraint_schema
join information_schema.referential_constraints rc
    on tc.constraint_name = rc.constraint_name and tc.constraint_schema = rc.constraint_schema
where tc.table_schema = 'public'
  and tc.table_name in ('free_text_consent_events', 'free_text_consent_cycles')
  and tc.constraint_type = 'FOREIGN KEY'
  and kcu.column_name = 'flow_attempt_id'
order by tc.table_name, tc.constraint_name;

-- =====================================================================
-- 7. Indice unico parcial presente, con el predicado correcto.
-- =====================================================================
select
    indexname,
    indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'free_text_consent_cycles'
order by indexname;
-- Verificar manualmente que idx_free_text_consent_cycles_one_open_active
-- aparece con "WHERE (lifecycle_state = 'active'::text) AND (closed_seq IS NULL)"
-- (o equivalente) en su definicion.

-- =====================================================================
-- 8. Vista activa presente, con la definicion esperada.
-- =====================================================================
select
    schemaname, viewname, definition
from pg_views
where schemaname = 'public' and viewname = 'active_free_text_consent_cycles';

-- =====================================================================
-- 9. Conteos antes/despues compatibles -- ningun evento perdido.
--    Comparar este numero contra el "total_eventos" capturado en el
--    preflight (seccion 4 de VEGA_Preflight_FreeTextCycles_SQL_v1.sql,
--    ejecutado ANTES de aplicar la migracion). Deben ser iguales.
-- =====================================================================
select count(*) as total_eventos_tras_migracion from public.free_text_consent_events;

select action, count(*) as total from public.free_text_consent_events group by action order by action;

select count(*) as total_ciclos from public.free_text_consent_cycles;

-- =====================================================================
-- 10. Grants/revokes -- ninguno de los tres roles de cliente debe tener
--     privilegio alguno sobre las tablas/vista base.
--
--     Nota importante sobre BYPASSRLS: ese atributo de rol solo hace que
--     las politicas de Row Level Security no se apliquen a ese rol --
--     NO concede ni implica ningun privilegio SQL (SELECT/INSERT/
--     UPDATE/DELETE) sobre una tabla. Un rol con BYPASSRLS pero sin
--     GRANT explicito (directo, via PUBLIC, o heredado de otro rol del
--     que es miembro) sigue sin poder leer ni escribir esa tabla. Por
--     eso has_table_privilege(...) -- que evalua exactamente esos tres
--     origenes de privilegio, no RLS -- es la comprobacion correcta
--     aqui, y no basta con razonar sobre BYPASSRLS para descartar o
--     confirmar el aislamiento. No se puede dar por cerrado el
--     aislamiento de permisos de service_role sin ejecutar esta consulta
--     contra el proyecto Supabase real.
-- =====================================================================
select
    'free_text_consent_events' as relation,
    has_table_privilege('anon', 'public.free_text_consent_events', 'SELECT') as anon_select,
    has_table_privilege('authenticated', 'public.free_text_consent_events', 'SELECT') as authenticated_select,
    has_table_privilege('service_role', 'public.free_text_consent_events', 'DELETE') as service_role_delete
union all
select
    'free_text_consent_cycles',
    has_table_privilege('anon', 'public.free_text_consent_cycles', 'SELECT'),
    has_table_privilege('authenticated', 'public.free_text_consent_cycles', 'SELECT'),
    has_table_privilege('service_role', 'public.free_text_consent_cycles', 'SELECT')
union all
select
    'active_free_text_consent_cycles',
    has_table_privilege('anon', 'public.active_free_text_consent_cycles', 'SELECT'),
    has_table_privilege('authenticated', 'public.active_free_text_consent_cycles', 'SELECT'),
    has_table_privilege('service_role', 'public.active_free_text_consent_cycles', 'SELECT');
-- Todas las columnas booleanas deberian ser "false". Si alguna es
-- "true" (especialmente las de service_role), el REVOKE no tuvo el
-- efecto esperado -- investigar el modelo de privilegios de ese rol en
-- este proyecto Supabase antes de confiar en el aislamiento descrito.

-- =====================================================================
-- 11. service_role sin permiso sobre el legal hold -- debe ser false.
-- =====================================================================
select
    has_function_privilege(
        'service_role',
        'public.set_free_text_consent_cycle_retention_hold(uuid, boolean)',
        'EXECUTE'
    ) as service_role_puede_ejecutar_legal_hold;
-- Debe ser "false". Si es "true", ninguna ruta de la aplicacion lo usa
-- hoy, pero el aislamiento previsto (solo administracion manual) no
-- esta realmente garantizado por permisos.

-- =====================================================================
-- 12. Funciones con las firmas correctas -- confirma que las 6
--     funciones existen con los parametros/tipo de retorno esperados.
-- =====================================================================
select
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as returns
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
      'submit_problem_context_with_free_text',
      'withdraw_free_text_consent',
      'purge_expired_experiment_personal_data',
      'perform_delete_all_own_data',
      'purge_expired_free_text_consent_events',
      'set_free_text_consent_cycle_retention_hold'
  )
order by p.proname;
-- Esperado:
--   submit_problem_context_with_free_text(uuid, text, text, text) -> TABLE(outcome text)
--   withdraw_free_text_consent(uuid) -> TABLE(outcome text, previews_deleted integer)
--   purge_expired_experiment_personal_data() -> void
--   perform_delete_all_own_data(uuid) -> TABLE(flow_attempts_affected integer, waitlist_entry_deleted boolean)
--   purge_expired_free_text_consent_events() -> void
--   set_free_text_consent_cycle_retention_hold(uuid, boolean) -> void

-- =====================================================================
-- 13. Cron todavia apuntando a la misma funcion (mismo nombre, sin
--     argumentos) -- debe coincidir con lo visto en el preflight.
-- =====================================================================
select jobid, jobname, schedule, command, active
from cron.job
where command ilike '%purge_expired_free_text_consent_events%';

-- =====================================================================
-- RESUMEN -- interpretacion rapida.
-- =====================================================================
with
checks as (
    select 'Granted sin ciclo (punto 1)' as check_name,
        (select count(*) from public.free_text_consent_events e where e.action = 'granted'
         and not exists (select 1 from public.free_text_consent_cycles c where c.opened_seq = e.seq)) as violaciones
    union all
    select 'Terminal sin ciclo (punto 2)',
        (select count(*) from public.free_text_consent_events e
         where e.action in ('withdrawn', 'expired', 'erasure_requested')
         and not exists (select 1 from public.free_text_consent_cycles c where c.closed_seq = e.seq))
    union all
    select 'Ciclos solapados (punto 3)',
        (select count(*) from public.free_text_consent_cycles c1
         join public.free_text_consent_cycles c2 on c1.flow_attempt_id = c2.flow_attempt_id and c1.id <> c2.id
         and c1.opened_seq < c2.opened_seq and (c1.closed_seq is null or c1.closed_seq > c2.opened_seq))
    union all
    select 'Mas de un ciclo abierto activo por intento (punto 4)',
        (select count(*) from (
            select flow_attempt_id from public.free_text_consent_cycles
            where lifecycle_state = 'active' and closed_seq is null
            group by flow_attempt_id having count(*) > 1
        ) x)
    union all
    select 'FK RESTRICT en free_text_consent_events.flow_attempt_id (punto 6)',
        (select count(*) from information_schema.table_constraints tc
         join information_schema.key_column_usage kcu
            on tc.constraint_name = kcu.constraint_name and tc.constraint_schema = kcu.constraint_schema
         join information_schema.referential_constraints rc
            on tc.constraint_name = rc.constraint_name and tc.constraint_schema = rc.constraint_schema
         where tc.table_schema = 'public' and tc.table_name = 'free_text_consent_events'
           and tc.constraint_type = 'FOREIGN KEY' and kcu.column_name = 'flow_attempt_id'
           and rc.delete_rule <> 'RESTRICT')
    union all
    select 'FK RESTRICT en free_text_consent_cycles.flow_attempt_id (punto 6)',
        (select count(*) from information_schema.table_constraints tc
         join information_schema.key_column_usage kcu
            on tc.constraint_name = kcu.constraint_name and tc.constraint_schema = kcu.constraint_schema
         join information_schema.referential_constraints rc
            on tc.constraint_name = rc.constraint_name and tc.constraint_schema = rc.constraint_schema
         where tc.table_schema = 'public' and tc.table_name = 'free_text_consent_cycles'
           and tc.constraint_type = 'FOREIGN KEY' and kcu.column_name = 'flow_attempt_id'
           and rc.delete_rule <> 'RESTRICT')
    union all
    select 'service_role con EXECUTE sobre el legal hold (punto 11)',
        (select case when has_function_privilege(
            'service_role', 'public.set_free_text_consent_cycle_retention_hold(uuid, boolean)', 'EXECUTE'
        ) then 1 else 0 end)
    union all
    select 'Cron sigue apuntando a purge_expired_free_text_consent_events (punto 13)',
        (select 1 - count(*) from cron.job where command ilike '%purge_expired_free_text_consent_events%')
)
select
    check_name,
    violaciones,
    case when violaciones = 0 then 'OK' else 'REVISAR' end as estado
from checks
order by estado desc, check_name;
