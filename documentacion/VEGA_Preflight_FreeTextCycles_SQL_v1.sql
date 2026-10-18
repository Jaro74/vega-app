-- VEGA -- PREFLIGHT de produccion para
-- 20260112000000_free_text_consent_cycles.sql
--
-- 100% SOLO LECTURA. No contiene ningun INSERT/UPDATE/DELETE/ALTER/
-- CREATE/DROP/GRANT/REVOKE/TRUNCATE ni llamada a funcion que modifique
-- datos -- unicamente SELECT sobre metadatos (information_schema,
-- pg_catalog, cron.job) y sobre los datos ya existentes. Ejecutar
-- manualmente en el SQL editor de Supabase ANTES de aplicar la
-- migracion, y revisar el bloque "RESUMEN" al final.
--
-- Cada seccion es un SELECT independiente: ejecutar todo el archivo de
-- una vez muestra cada resultado por separado en la mayoria de clientes
-- SQL (incluido el editor de Supabase).

-- =====================================================================
-- 1. Existencia y columnas actuales de free_text_consent_events.
-- =====================================================================
select
    column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'free_text_consent_events'
order by ordinal_position;

-- =====================================================================
-- 2. Nombres exactos de sus constraints (la migracion asume
--    free_text_consent_events_action_check y
--    free_text_consent_events_flow_attempt_id_fkey -- si algun nombre
--    aqui no coincide, hay que ajustar esos dos ALTER TABLE antes de
--    aplicar la migracion).
-- =====================================================================
select
    conname as constraint_name,
    contype as constraint_type, -- 'c' = check, 'f' = foreign key
    pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.free_text_consent_events'::regclass
order by contype, conname;

-- =====================================================================
-- 3. Definicion actual completa de la FK de flow_attempt_id hacia
--    flow_attempts. Filtra explicitamente por kcu.column_name =
--    'flow_attempt_id' -- free_text_consent_events tiene otra FK propia
--    (consent_version -> free_text_consent_versions) y un filtro que no
--    distinga por columna local devuelve ambas mezcladas en el mismo
--    resultado, lo que puede llevar a atribuir el delete_rule de una a
--    la otra. Confirmado contra Supabase real: esta FK YA esta en ON
--    DELETE RESTRICT -- la migracion NO la modifica.
-- =====================================================================
select
    tc.constraint_name,
    kcu.column_name as local_column,
    rc.update_rule,
    rc.delete_rule,
    ccu.table_name as referenced_table,
    ccu.column_name as referenced_column
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name and tc.constraint_schema = kcu.constraint_schema
join information_schema.referential_constraints rc
    on tc.constraint_name = rc.constraint_name and tc.constraint_schema = rc.constraint_schema
join information_schema.constraint_column_usage ccu
    on rc.unique_constraint_name = ccu.constraint_name
where tc.table_schema = 'public'
  and tc.table_name = 'free_text_consent_events'
  and tc.constraint_type = 'FOREIGN KEY'
  and kcu.column_name = 'flow_attempt_id';

-- =====================================================================
-- 4. Acciones existentes y conteo por action + total de eventos.
-- =====================================================================
select action, count(*) as total
from public.free_text_consent_events
group by action
order by action;

select count(*) as total_eventos from public.free_text_consent_events;

-- =====================================================================
-- 5. Secuencias historicas imposibles.
-- =====================================================================

-- 5.1 Terminal antes de granted (el primer evento de un intento ya es
--     un terminal -- no puede cerrarse un ciclo que nunca se abrio).
select flow_attempt_id, seq, action
from (
    select
        flow_attempt_id, seq, action,
        row_number() over (partition by flow_attempt_id order by seq) as rn
    from public.free_text_consent_events
) ranked
where rn = 1 and action in ('withdrawn', 'expired');

-- 5.2 Dos 'granted' consecutivos sin terminal entre medias.
select flow_attempt_id, seq as granted_seq_actual, lead_seq as granted_seq_siguiente
from (
    select
        flow_attempt_id, seq, action,
        lead(seq) over (partition by flow_attempt_id order by seq) as lead_seq,
        lead(action) over (partition by flow_attempt_id order by seq) as lead_action
    from public.free_text_consent_events
) sequenced
where action = 'granted' and lead_action = 'granted';

-- 5.3 Dos eventos terminales consecutivos (withdrawn/expired seguido de
--     otro withdrawn/expired, sin un granted entre medias).
select flow_attempt_id, seq as terminal_seq_actual, lead_seq as terminal_seq_siguiente
from (
    select
        flow_attempt_id, seq, action,
        lead(seq) over (partition by flow_attempt_id order by seq) as lead_seq,
        lead(action) over (partition by flow_attempt_id order by seq) as lead_action
    from public.free_text_consent_events
) sequenced
where action in ('withdrawn', 'expired') and lead_action in ('withdrawn', 'expired');

-- 5.4 Mas eventos terminales que aperturas en algun punto de la
--     secuencia (version "acumulada" del mismo problema).
select flow_attempt_id, seq, grants_so_far, terminals_so_far
from (
    select
        flow_attempt_id, seq,
        count(*) filter (where action = 'granted')
            over (partition by flow_attempt_id order by seq) as grants_so_far,
        count(*) filter (where action in ('withdrawn', 'expired'))
            over (partition by flow_attempt_id order by seq) as terminals_so_far
    from public.free_text_consent_events
) running
where terminals_so_far > grants_so_far;

-- =====================================================================
-- 6. Ciclos historicos reconstruibles granted -> withdrawn|expired
--    (previsualizacion exacta de lo que el backfill de la migracion
--    insertaria en free_text_consent_cycles -- sin escribir nada).
-- =====================================================================
with sequenced as (
    select
        e.seq,
        e.flow_attempt_id,
        e.action,
        e.consent_version,
        e.created_at,
        lead(e.seq) over (partition by e.flow_attempt_id order by e.seq) as next_seq,
        lead(e.action) over (partition by e.flow_attempt_id order by e.seq) as next_action,
        lead(e.created_at) over (partition by e.flow_attempt_id order by e.seq) as next_created_at
    from public.free_text_consent_events e
)
select
    s.flow_attempt_id,
    s.seq as opened_seq,
    case when s.next_action in ('withdrawn', 'expired') then s.next_seq end as closed_seq_previsto,
    case when s.next_action in ('withdrawn', 'expired') then s.next_action end as close_reason_previsto,
    s.consent_version,
    case when s.next_action in ('withdrawn', 'expired')
         then s.next_created_at + interval '36 months'
    end as ordinary_destroy_after_previsto
from sequenced s
where s.action = 'granted'
order by s.flow_attempt_id, s.seq;

-- =====================================================================
-- 7. Grants actualmente abiertos (ciclos que el backfill marcaria como
--    todavia abiertos, closed_seq null -- el ultimo 'granted' de cada
--    intento sin ningun evento posterior).
-- =====================================================================
select flow_attempt_id, seq as granted_seq, created_at
from (
    select
        flow_attempt_id, seq, action, created_at,
        lead(seq) over (partition by flow_attempt_id order by seq) as next_seq
    from public.free_text_consent_events
) sequenced
where action = 'granted' and next_seq is null;

-- =====================================================================
-- 8. Eventos huerfanos respecto a flow_attempts (no deberia haber
--    ninguno -- la FK ya existente, aunque hoy sea CASCADE, impide
--    insertar un evento con un flow_attempt_id inexistente).
-- =====================================================================
select e.seq, e.flow_attempt_id
from public.free_text_consent_events e
where not exists (
    select 1 from public.flow_attempts fa where fa.id = e.flow_attempt_id
);

-- =====================================================================
-- 9. Versiones de consentimiento referenciadas que no existen en
--    free_text_consent_versions (no deberia haber ninguna -- la FK
--    existente ya lo impide, pero se comprueba igualmente).
-- =====================================================================
select distinct e.consent_version
from public.free_text_consent_events e
where not exists (
    select 1 from public.free_text_consent_versions v where v.version = e.consent_version
);

-- Catalogo completo de versiones existentes, para referencia.
select version, effective_from from public.free_text_consent_versions order by effective_from;

-- =====================================================================
-- 10. Definicion actual y grants de las 4 funciones que la migracion
--     va a redefinir (submit_problem_context_with_free_text,
--     withdraw_free_text_consent, purge_expired_experiment_personal_data,
--     purge_expired_free_text_consent_events).
-- =====================================================================
select
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
      'submit_problem_context_with_free_text',
      'withdraw_free_text_consent',
      'purge_expired_experiment_personal_data',
      'purge_expired_free_text_consent_events'
  );

select
    p.proname as function_name,
    has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
    has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
      'submit_problem_context_with_free_text',
      'withdraw_free_text_consent',
      'purge_expired_experiment_personal_data',
      'purge_expired_free_text_consent_events'
  );

-- =====================================================================
-- 11. Existencia real del cron que llama a
--     purge_expired_free_text_consent_events -- jobid, jobname,
--     schedule, command, active. Si no aparece ninguna fila, el job no
--     existe con ese nombre exacto; revisar manualmente en el dashboard
--     de Supabase antes de asumir nada.
-- =====================================================================
select jobid, jobname, schedule, command, active
from cron.job
where command ilike '%purge_expired_free_text_consent_events%'
   or jobname ilike '%free%text%consent%'
   or jobname ilike '%free-text%';

-- Listado completo de jobs existentes, por si el anterior no encuentra
-- nada y hace falta identificarlo por otro nombre/command.
select jobid, jobname, schedule, command, active from cron.job order by jobid;

-- =====================================================================
-- 12. Otros datos de esquema que la migracion asume: existencia y
--     columnas de las tablas que perform_delete_all_own_data() toca
--     directamente (problem_context, partner_input,
--     partner_derived_profile, previews, waitlist, user_birth_profile,
--     flow_attempts) -- confirma que flow_attempt_id/user_id existen
--     con esos nombres exactos antes de aplicar la migracion.
-- =====================================================================
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in (
      'problem_context', 'partner_input', 'partner_derived_profile',
      'previews', 'waitlist', 'user_birth_profile', 'flow_attempts',
      'free_text_consent_versions'
  )
  and column_name in ('flow_attempt_id', 'user_id', 'delete_after', 'used_free_text', 'id')
order by table_name, column_name;

-- =====================================================================
-- RESUMEN -- interpretacion rapida. Cada fila indica OK si el conteo es
-- el esperado, o REVISAR si requiere mirar manualmente la seccion
-- correspondiente antes de aplicar la migracion.
-- =====================================================================
with
checks as (
    select 'Eventos huerfanos respecto a flow_attempts (seccion 8)' as check_name,
        (select count(*) from public.free_text_consent_events e
         where not exists (select 1 from public.flow_attempts fa where fa.id = e.flow_attempt_id)) as violaciones
    union all
    select 'Versiones de consentimiento inexistentes (seccion 9)',
        (select count(*) from (
            select distinct e.consent_version from public.free_text_consent_events e
            where not exists (select 1 from public.free_text_consent_versions v where v.version = e.consent_version)
        ) x)
    union all
    select 'Terminal antes de granted (seccion 5.1)',
        (select count(*) from (
            select flow_attempt_id, action,
                row_number() over (partition by flow_attempt_id order by seq) as rn
            from public.free_text_consent_events
        ) ranked where rn = 1 and action in ('withdrawn', 'expired'))
    union all
    select 'Dos granted consecutivos (seccion 5.2)',
        (select count(*) from (
            select action, lead(action) over (partition by flow_attempt_id order by seq) as lead_action
            from public.free_text_consent_events
        ) sequenced where action = 'granted' and lead_action = 'granted')
    union all
    select 'Dos terminales consecutivos (seccion 5.3)',
        (select count(*) from (
            select action, lead(action) over (partition by flow_attempt_id order by seq) as lead_action
            from public.free_text_consent_events
        ) sequenced where action in ('withdrawn', 'expired') and lead_action in ('withdrawn', 'expired'))
    union all
    select 'Mas terminales que aperturas en algun punto (seccion 5.4)',
        (select count(*) from (
            select
                count(*) filter (where action = 'granted')
                    over (partition by flow_attempt_id order by seq) as grants_so_far,
                count(*) filter (where action in ('withdrawn', 'expired'))
                    over (partition by flow_attempt_id order by seq) as terminals_so_far
            from public.free_text_consent_events
        ) running where terminals_so_far > grants_so_far)
    union all
    select 'Cron purge-free-text-consent-events-expired encontrado (seccion 11)',
        (select 1 - count(*) from cron.job where command ilike '%purge_expired_free_text_consent_events%')
        -- 0 si se encontro al menos un job (OK), 1 si no se encontro ninguno (REVISAR)
)
select
    check_name,
    violaciones,
    case when violaciones = 0 then 'OK' else 'REVISAR' end as estado
from checks
order by estado desc, check_name;
