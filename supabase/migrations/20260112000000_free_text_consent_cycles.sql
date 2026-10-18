-- VEGA -- ciclos de consentimiento del free_text (free_text_consent_cycles),
-- legal hold y RPC transaccional de /delete-all.
--
-- Implementa la posicion juridica ya cerrada (ver
-- documentacion/VEGA_Revision_Retencion_ConsentEvents_v1.md y el diseno
-- tecnico acordado en conversacion posterior, no documentado todavia en
-- un VEGA_*.md dedicado):
--   - conservacion probatoria ordinaria de 36 meses desde el evento
--     terminal de cada ciclo de consentimiento del free_text;
--   - bloqueo (nunca destruccion inmediata) conforme al art. 32 LOPDGDD
--     ante cualquier supresion, incluido /delete-all;
--   - una solicitud de supresion NUNCA reinicia el plazo de 36 meses ya
--     fijado -- blocked_at es solo evidencia de cuando se bloqueo, no
--     un nuevo punto de partida del plazo;
--   - conservacion excepcional (legal hold) si existe una reclamacion,
--     investigacion o litigio concreto, sin almacenar su contenido.
--
-- Aditiva sobre 20260110000000_free_text_consent.sql /
-- 20260111000000_free_text_consent_v2.sql: no modifica
-- free_text_consent_versions, problem_context, previews ni ninguna otra
-- tabla fuera de lo listado aqui.
--
-- IMPORTANTE -- aplicacion manual: esta migracion NO se ha ejecutado
-- contra Supabase. Antes de aplicarla, verificar el cron existente
-- (seccion 12) y el nombre real de la constraint que se elimina en la
-- seccion 1 (puede diferir del asumido aqui si Supabase le asigno otro
-- nombre al crearla).
--
-- Verificado contra Supabase real mediante el preflight de produccion
-- (consulta sobre pg_constraint filtrando contype = 'f' en
-- free_text_consent_events): la FK free_text_consent_events_flow_attempt_id_fkey
-- YA esta en ON DELETE RESTRICT -- no en CASCADE como se asumio en una
-- version anterior de esta migracion. Esta migracion, por tanto, NO
-- toca esa FK (ver nota en la seccion 1). La FK
-- free_text_consent_events_consent_version_fkey (hacia
-- free_text_consent_versions) es una constraint distinta, no afectada
-- ni mencionada en ningun punto de esta migracion.

-- =====================================================================
-- 1. free_text_consent_events sigue siendo un historial append-only
--    puro -- nunca se le anade ningun campo de estado. Unico cambio:
--    nuevo valor de accion ('erasure_requested', el cierre de ciclo que
--    produce /delete-all). La FK hacia flow_attempts YA esta en ON
--    DELETE RESTRICT en Supabase real (confirmado por el preflight de
--    produccion) -- esta tabla contiene evidencia que puede estar
--    bloqueada por el art. 32 LOPDGDD y no debe poder desaparecer como
--    efecto colateral de borrar flow_attempts, y esa proteccion ya
--    existe, por lo que esta migracion no necesita (ni debe) tocarla.
-- =====================================================================
alter table public.free_text_consent_events
    drop constraint free_text_consent_events_action_check,
    add constraint free_text_consent_events_action_check
        check (action in ('granted', 'withdrawn', 'expired', 'erasure_requested'));

-- =====================================================================
-- 2. free_text_consent_cycles: una fila por ciclo granted -> terminal.
--    Vive aqui todo el ESTADO (abierto/cerrado, bloqueado, fechas,
--    legal hold) -- free_text_consent_events nunca se actualiza tras el
--    insert, ni siquiera con metadatos.
-- =====================================================================
create table public.free_text_consent_cycles (
    id uuid primary key default gen_random_uuid(),
    flow_attempt_id uuid not null
        references public.flow_attempts(id) on delete restrict,

    -- Evento 'granted' que abrio el ciclo.
    opened_seq bigint not null unique
        references public.free_text_consent_events(seq),

    -- Evento terminal (withdrawn/expired/erasure_requested) que lo
    -- cerro -- null mientras el ciclo esta abierto.
    closed_seq bigint unique
        references public.free_text_consent_events(seq),
    close_reason text
        check (close_reason in ('withdrawn', 'expired', 'erasure_requested')),

    -- Copiado del 'granted' al abrir el ciclo: evita que cualquier RPC
    -- operativa (incluida purge_expired_experiment_personal_data())
    -- tenga que leer jamas free_text_consent_events para decidir nada.
    consent_version text not null
        references public.free_text_consent_versions(version),

    -- 'active': participa en la vista activa, visible para las RPC
    -- operativas. 'blocked': evidencia bloqueada conforme al art. 32
    -- LOPDGDD (via /delete-all) -- invisible para ellas, solo
    -- disponible para responsabilidad/acreditacion, destruccion o
    -- legal hold.
    lifecycle_state text not null default 'active'
        check (lifecycle_state in ('active', 'blocked')),
    blocked_at timestamptz,

    -- Fecha objetiva de destruccion ordinaria: 36 meses desde el evento
    -- terminal, fijada UNA SOLA VEZ en el momento de cerrar el ciclo
    -- (withdrawn/expired/erasure_requested). Ninguna funcion la
    -- recalcula ni la reinicia despues -- en particular, bloquear un
    -- ciclo (via /delete-all) nunca la toca: una solicitud de supresion
    -- no abre un nuevo periodo completo de conservacion.
    ordinary_destroy_after timestamptz,

    -- Legal hold: conservacion excepcional si existe una reclamacion,
    -- investigacion o litigio concreto. Deliberadamente sin texto de
    -- motivo ni datos de la reclamacion -- solo el booleano y las dos
    -- marcas de tiempo. retention_hold_at = inicio del hold VIGENTE;
    -- retention_hold_released_at = su liberacion. Si se activa un hold
    -- nuevo tras liberar uno anterior, retention_hold_at se sustituye
    -- por la nueva activacion y retention_hold_released_at vuelve a
    -- null -- no se guarda historial de sucesivos holds en esta fase.
    retention_hold boolean not null default false,
    retention_hold_at timestamptz,
    retention_hold_released_at timestamptz,

    -- Cerrado <=> los tres campos de cierre presentes a la vez; abierto
    -- <=> los tres ausentes a la vez -- nunca un estado intermedio.
    constraint free_text_consent_cycles_closure_consistency check (
        (closed_seq is null and close_reason is null and ordinary_destroy_after is null)
        or
        (closed_seq is not null and close_reason is not null and ordinary_destroy_after is not null)
    ),

    -- blocked implica blocked_at, Y ciclo cerrado -- "blocked" sobre un
    -- ciclo todavia abierto es un estado imposible, rechazado aqui por
    -- PostgreSQL, no solo evitado por las RPC.
    constraint free_text_consent_cycles_blocked_has_timestamp
        check (lifecycle_state <> 'blocked' or blocked_at is not null),
    constraint free_text_consent_cycles_blocked_requires_closed_cycle
        check (lifecycle_state <> 'blocked' or closed_seq is not null),

    -- Legal hold solo sobre ciclo cerrado -- un hold probatorio no debe
    -- usarse para congelar un consentimiento todavia operativamente
    -- abierto. Reforzado tambien en
    -- set_free_text_consent_cycle_retention_hold() (seccion 10).
    constraint free_text_consent_cycles_hold_requires_closed_cycle
        check (not retention_hold or closed_seq is not null),

    -- Activo => fecha de activacion; liberado => hubo una activacion
    -- previa (no se libera lo nunca retenido); activo y liberado a la
    -- vez es imposible (reactivar limpia la fecha de liberacion).
    constraint free_text_consent_cycles_hold_active_has_timestamp
        check (not retention_hold or retention_hold_at is not null),
    constraint free_text_consent_cycles_hold_released_implies_held
        check (retention_hold_released_at is null or retention_hold_at is not null),
    constraint free_text_consent_cycles_hold_not_active_and_released
        check (not retention_hold or retention_hold_released_at is null)
);

create index idx_free_text_consent_cycles_flow_attempt
    on public.free_text_consent_cycles(flow_attempt_id);

-- Invariante fuerte, no solo garantizado por el locking: como maximo un
-- ciclo abierto y activo por flow_attempt_id.
create unique index idx_free_text_consent_cycles_one_open_active
    on public.free_text_consent_cycles(flow_attempt_id)
    where lifecycle_state = 'active' and closed_seq is null;

-- Superficie de lectura para TODA RPC de producto/retencion operativa.
-- Contiene ciclos abiertos y ciclos cerrados que todavia no han sido
-- bloqueados ni destruidos -- nunca ciclos 'blocked'. Las unicas
-- funciones autorizadas a leer/escribir la tabla base directamente son
-- las de bloqueo (perform_delete_all_own_data), destruccion
-- (purge_expired_free_text_consent_events) y legal hold
-- (set_free_text_consent_cycle_retention_hold).
create view public.active_free_text_consent_cycles as
    select * from public.free_text_consent_cycles where lifecycle_state = 'active';

-- Ninguna ruta de la aplicacion hace jamas un .from(...) directo contra
-- estas dos relaciones -- todo el acceso es via las RPC de abajo, que
-- corren como su propietario (security definer), no como el llamador.
-- Por eso ni siquiera service_role necesita grant alguno sobre ellas.
revoke all on public.free_text_consent_cycles from public, anon, authenticated, service_role;
revoke all on public.active_free_text_consent_cycles from public, anon, authenticated, service_role;

-- Misma razon: tras esta migracion, ningun codigo de la aplicacion
-- borra filas de free_text_consent_events directamente (ese borrado
-- fisico directo queda eliminado del flujo normal) -- el unico camino
-- es a traves de las RPC, que tampoco necesitan que service_role tenga
-- grants propios sobre la tabla.
revoke all on public.free_text_consent_events from service_role;

-- =====================================================================
-- 3. Validaciones PRE-backfill: ambas dependen unicamente de
--    free_text_consent_events (todavia no existe ninguna fila en
--    free_text_consent_cycles en este punto), asi que se ejecutan ANTES
--    del INSERT del backfill (seccion 3b). Si el historial real
--    contuviera una secuencia corrupta -- p. ej. dos 'granted'
--    consecutivos sin terminal entre medias -- el propio INSERT
--    intentaria crear dos ciclos abiertos simultaneos para el mismo
--    flow_attempt_id y violaria el indice unico parcial
--    idx_free_text_consent_cycles_one_open_active con un error crudo de
--    Postgres. Ejecutar estas comprobaciones primero garantiza que la
--    migracion aborta con nuestro mensaje explicito antes de llegar a
--    ese punto.
-- =====================================================================
do $$
declare
    v_count integer;
begin
    -- 3.1 mas eventos terminales que aperturas en algun punto de la
    -- secuencia (ciclo con mas de un terminal / secuencia imposible).
    select count(*) into v_count
        from (
            select
                flow_attempt_id, seq,
                count(*) filter (where action = 'granted')
                    over (partition by flow_attempt_id order by seq) as grants_so_far,
                count(*) filter (where action in ('withdrawn', 'expired', 'erasure_requested'))
                    over (partition by flow_attempt_id order by seq) as terminals_so_far
            from public.free_text_consent_events
        ) running
        where terminals_so_far > grants_so_far;
    if v_count > 0 then
        raise exception 'Backfill de free_text_consent_cycles invalido: % evento(s) con mas terminales que aperturas en su secuencia', v_count;
    end if;

    -- 3.2 secuencias historicas imposibles: primer evento de un intento
    -- que ya es un terminal, o dos 'granted' consecutivos sin terminal
    -- entre medias.
    select count(*) into v_count
        from (
            select
                flow_attempt_id, seq, action,
                row_number() over (partition by flow_attempt_id order by seq) as rn,
                lead(action) over (partition by flow_attempt_id order by seq) as next_action
            from public.free_text_consent_events
        ) sequenced_check
        where (rn = 1 and action in ('withdrawn', 'expired', 'erasure_requested'))
           or (action = 'granted' and next_action = 'granted');
    if v_count > 0 then
        raise exception 'Backfill de free_text_consent_cycles invalido: % secuencia(s) historica(s) imposible(s)', v_count;
    end if;
end $$;

-- =====================================================================
-- 3b. Backfill: reconstruccion de los ciclos ya existentes a partir del
--    historial real de free_text_consent_events. La ventana se calcula
--    sobre TODA la secuencia sin filtrar -- el filtro a "solo granted"
--    se aplica DESPUES, sobre el resultado ya calculado. Filtrar antes
--    de la ventana haria que lead() solo viera otras filas 'granted',
--    saltandose cualquier withdrawn/expired real intermedio.
--    Deterministico (depende solo de seq), auditable (cada fila
--    resultante es trazable a su evento origen) e idempotente
--    (on conflict do nothing). ordinary_destroy_after usa la fecha
--    HISTORICA real del evento terminal (next_created_at), nunca
--    now() -- un ciclo cerrado hace meses conserva la fecha de
--    destruccion calculada desde entonces, no desde el momento de
--    migrar.
-- =====================================================================
with sequenced as (
    select
        e.seq,
        e.flow_attempt_id,
        e.action,
        e.consent_version,
        lead(e.seq) over (partition by e.flow_attempt_id order by e.seq) as next_seq,
        lead(e.action) over (partition by e.flow_attempt_id order by e.seq) as next_action,
        lead(e.created_at) over (partition by e.flow_attempt_id order by e.seq) as next_created_at
    from public.free_text_consent_events e
)
insert into public.free_text_consent_cycles
    (flow_attempt_id, opened_seq, closed_seq, close_reason, consent_version, ordinary_destroy_after)
select
    s.flow_attempt_id,
    s.seq,
    case when s.next_action in ('withdrawn', 'expired', 'erasure_requested')
         then s.next_seq end,
    case when s.next_action in ('withdrawn', 'expired', 'erasure_requested')
         then s.next_action end,
    s.consent_version,
    case when s.next_action in ('withdrawn', 'expired', 'erasure_requested')
         then s.next_created_at + interval '36 months'
    end
from sequenced s
where s.action = 'granted'
on conflict (opened_seq) do nothing;

-- =====================================================================
-- 4. Validaciones POST-backfill: dependen de que free_text_consent_cycles
--    ya este poblada (comprueban correspondencia 1:1 con los eventos y
--    ausencia de solapes), por lo que se ejecutan despues del INSERT de
--    la seccion 3b. Las dos comprobaciones que no necesitaban esperar a
--    esto (mas terminales que aperturas; secuencias historicas
--    imposibles) ya se ejecutaron antes, en la seccion 3. La migracion
--    ABORTA (raise exception) si cualquiera encuentra una fila --
--    "idempotente pero no silenciosa", mismo principio que el seed de
--    v1/v2 en 20260110000000_free_text_consent.sql /
--    20260111000000_free_text_consent_v2.sql.
-- =====================================================================
do $$
declare
    v_count integer;
begin
    -- 4.1 granted sin ciclo.
    select count(*) into v_count
        from public.free_text_consent_events e
        where e.action = 'granted'
          and not exists (
              select 1 from public.free_text_consent_cycles c where c.opened_seq = e.seq
          );
    if v_count > 0 then
        raise exception 'Backfill de free_text_consent_cycles invalido: % evento(s) granted sin ciclo asociado', v_count;
    end if;

    -- 4.2 terminal sin ciclo.
    select count(*) into v_count
        from public.free_text_consent_events e
        where e.action in ('withdrawn', 'expired', 'erasure_requested')
          and not exists (
              select 1 from public.free_text_consent_cycles c where c.closed_seq = e.seq
          );
    if v_count > 0 then
        raise exception 'Backfill de free_text_consent_cycles invalido: % evento(s) terminal(es) sin ciclo asociado', v_count;
    end if;

    -- 4.3 ciclos solapados para el mismo flow_attempt_id.
    select count(*) into v_count
        from public.free_text_consent_cycles c1
        join public.free_text_consent_cycles c2
          on c1.flow_attempt_id = c2.flow_attempt_id
         and c1.id <> c2.id
         and c1.opened_seq < c2.opened_seq
         and (c1.closed_seq is null or c1.closed_seq > c2.opened_seq);
    if v_count > 0 then
        raise exception 'Backfill de free_text_consent_cycles invalido: % par(es) de ciclos solapados', v_count;
    end if;
end $$;

-- =====================================================================
-- 5. submit_problem_context_with_free_text(): mismo lock canonico sobre
--    flow_attempts (sin cambios de posicion ni semantica). Sustituye la
--    lectura de "ultimo evento por seq" por active_free_text_consent_cycles
--    -- nunca lee free_text_consent_events ni free_text_consent_cycles
--    directamente.
-- =====================================================================
create or replace function public.submit_problem_context_with_free_text(
    p_flow_attempt_id uuid,
    p_trigger text,
    p_free_text text,
    p_consent_version text
)
returns table (outcome text)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_cycle record;
    v_new_seq bigint;
begin
    if p_free_text is null or btrim(p_free_text) = '' then
        raise exception 'submit_problem_context_with_free_text exige un free_text no vacio; usar el upsert simple cuando no hay texto';
    end if;

    if p_consent_version is null then
        raise exception 'submit_problem_context_with_free_text requiere consent_version cuando se proporciona free_text';
    end if;

    -- Lock canonico sobre flow_attempts: serializa esta funcion frente a
    -- withdraw_free_text_consent(), purge_expired_experiment_personal_data()
    -- y perform_delete_all_own_data() para el mismo intento.
    perform 1 from public.flow_attempts
        where id = p_flow_attempt_id
        for update;

    select id, consent_version into v_cycle
        from public.active_free_text_consent_cycles
        where flow_attempt_id = p_flow_attempt_id
          and closed_seq is null;

    if not found then
        insert into public.free_text_consent_events (flow_attempt_id, action, consent_version)
            values (p_flow_attempt_id, 'granted', p_consent_version)
            returning seq into v_new_seq;

        insert into public.free_text_consent_cycles (flow_attempt_id, opened_seq, consent_version)
            values (p_flow_attempt_id, v_new_seq, p_consent_version);

    elsif v_cycle.consent_version <> p_consent_version then
        return query select 'version_conflict'::text;
        return;
    end if;
    -- Si existe un ciclo abierto con la misma version: no se inserta
    -- ningun evento nuevo, solo se actualiza el texto abajo.

    insert into public.problem_context (flow_attempt_id, trigger, free_text, text_provided, delete_after)
        values (p_flow_attempt_id, p_trigger, p_free_text, true, now() + interval '30 days')
    on conflict (flow_attempt_id) do update
        set trigger = excluded.trigger,
            free_text = excluded.free_text,
            text_provided = true,
            delete_after = excluded.delete_after;

    return query select 'ok'::text;
end;
$$;

-- =====================================================================
-- 6. withdraw_free_text_consent(): preserva el contrato de 4 outcomes
--    (withdrawn/already_withdrawn/already_expired/no_consent) leyendo
--    UNICAMENTE active_free_text_consent_cycles -- esa vista contiene
--    tanto el ciclo abierto vigente (si existe) como el ultimo ciclo ya
--    cerrado que todavia no ha sido bloqueado por /delete-all. Usa
--    FOUND tras el SELECT INTO, no v_cycle.id IS NULL.
-- =====================================================================
create or replace function public.withdraw_free_text_consent(
    p_flow_attempt_id uuid
)
returns table (outcome text, previews_deleted integer)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_cycle record;
    v_terminal_seq bigint;
    v_deleted_count integer := 0;
begin
    perform 1 from public.flow_attempts
        where id = p_flow_attempt_id
        for update;

    -- El ultimo ciclo VISIBLE de este intento: el abierto vigente, o el
    -- ultimo ya cerrado sin haber pasado por /delete-all. order by
    -- opened_seq desc basta: los ciclos de un mismo flow_attempt_id son
    -- siempre estrictamente secuenciales (nunca se solapan).
    select id, closed_seq, close_reason, consent_version into v_cycle
        from public.active_free_text_consent_cycles
        where flow_attempt_id = p_flow_attempt_id
        order by opened_seq desc
        limit 1;

    if not found then
        -- Ningun ciclo visible: nunca hubo uno, o todos quedaron
        -- 'blocked' tras /delete-all (desaparecen de la vista activa).
        return query select 'no_consent'::text, 0;
        return;
    end if;

    if v_cycle.closed_seq is not null then
        -- Ya cerrado, sin ciclo abierto despues: idempotente.
        -- close_reason = 'erasure_requested' es estructuralmente
        -- imposible aqui -- ese cierre bloquea el ciclo en el mismo
        -- paso, por lo que nunca queda 'active' y nunca aparece en esta
        -- vista.
        if v_cycle.close_reason = 'withdrawn' then
            return query select 'already_withdrawn'::text, 0;
        elsif v_cycle.close_reason = 'expired' then
            return query select 'already_expired'::text, 0;
        else
            raise exception 'close_reason inesperado en ciclo activo no abierto (cycle_id=%, close_reason=%)', v_cycle.id, v_cycle.close_reason;
        end if;
        return;
    end if;

    -- Ciclo abierto vigente: retirada real.
    delete from public.previews
        where flow_attempt_id = p_flow_attempt_id and used_free_text = true;
    get diagnostics v_deleted_count = row_count;

    update public.problem_context
        set free_text = null, text_provided = false
        where flow_attempt_id = p_flow_attempt_id;

    insert into public.free_text_consent_events (flow_attempt_id, action, consent_version)
        values (p_flow_attempt_id, 'withdrawn', v_cycle.consent_version)
        returning seq into v_terminal_seq;

    update public.free_text_consent_cycles
        set closed_seq = v_terminal_seq,
            close_reason = 'withdrawn',
            ordinary_destroy_after = now() + interval '36 months'
        where id = v_cycle.id;

    return query select 'withdrawn'::text, v_deleted_count;
end;
$$;

-- =====================================================================
-- 7. purge_expired_experiment_personal_data(): mismo lock por fila, sin
--    cambios de posicion. Unico cambio: el tramo relativo al free_text
--    lee active_free_text_consent_cycles en vez del ultimo evento crudo.
-- =====================================================================
create or replace function public.purge_expired_experiment_personal_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    r record;
    v_cycle record;
    v_text_provided boolean;
    v_delete_after timestamptz;
    v_terminal_seq bigint;
begin
    for r in
        select flow_attempt_id
        from public.problem_context
        where delete_after < now()
        order by flow_attempt_id
    loop
        perform 1 from public.flow_attempts
            where id = r.flow_attempt_id
            for update;

        select text_provided, delete_after into v_text_provided, v_delete_after
            from public.problem_context
            where flow_attempt_id = r.flow_attempt_id;

        if v_delete_after is null or v_delete_after >= now() then
            continue;
        end if;

        select id, consent_version into v_cycle
            from public.active_free_text_consent_cycles
            where flow_attempt_id = r.flow_attempt_id
              and closed_seq is null;

        if found and v_text_provided = true then
            insert into public.free_text_consent_events (flow_attempt_id, action, consent_version)
                values (r.flow_attempt_id, 'expired', v_cycle.consent_version)
                returning seq into v_terminal_seq;

            update public.free_text_consent_cycles
                set closed_seq = v_terminal_seq,
                    close_reason = 'expired',
                    ordinary_destroy_after = now() + interval '36 months'
                where id = v_cycle.id;
        end if;

        delete from public.problem_context where flow_attempt_id = r.flow_attempt_id;
    end loop;

    delete from public.user_birth_profile where delete_after < now();
    delete from public.previews where delete_after < now();
end;
$$;

-- =====================================================================
-- 8. perform_delete_all_own_data(): sustituye la orquestacion anterior
--    de deleteAllOwnData() (7 llamadas PostgREST separadas, sin
--    transaccion comun) por una unica RPC transaccional. Cualquier
--    error en cualquier punto revierte TODO -- no hay estado parcial
--    posible. Bloquea flow_attempts (orden determinista) y los ciclos
--    de cada intento (orden determinista) antes de leerlos/escribirlos.
-- =====================================================================
create or replace function public.perform_delete_all_own_data(
    p_user_id uuid
)
returns table (
    flow_attempts_affected integer,
    waitlist_entry_deleted boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
    r record;
    v_cycle record;
    v_flow_attempts_affected integer := 0;
    v_waitlist_deleted boolean := false;
    v_erasure_seq bigint;
begin
    for r in
        select id as flow_attempt_id
        from public.flow_attempts
        where user_id = p_user_id
        order by id
        for update
    loop
        v_flow_attempts_affected := v_flow_attempts_affected + 1;

        -- Cerrar (si procede) y bloquear los ciclos de consentimiento
        -- del free_text de este intento ANTES de borrar su contenido.
        for v_cycle in
            select id, closed_seq, consent_version
            from public.free_text_consent_cycles
            where flow_attempt_id = r.flow_attempt_id
              and lifecycle_state = 'active'
            order by id
            for update
        loop
            if v_cycle.closed_seq is null then
                insert into public.free_text_consent_events (flow_attempt_id, action, consent_version)
                    values (r.flow_attempt_id, 'erasure_requested', v_cycle.consent_version)
                    returning seq into v_erasure_seq;

                update public.free_text_consent_cycles
                set closed_seq = v_erasure_seq,
                    close_reason = 'erasure_requested',
                    ordinary_destroy_after = now() + interval '36 months',
                    lifecycle_state = 'blocked',
                    blocked_at = now()
                where id = v_cycle.id;
            else
                -- Ya cerrado (withdrawn/expired): solo se bloquea.
                -- ordinary_destroy_after NO se toca -- ya estaba fijado
                -- desde su cierre original; /delete-all nunca reinicia
                -- ese plazo.
                update public.free_text_consent_cycles
                set lifecycle_state = 'blocked',
                    blocked_at = now()
                where id = v_cycle.id;
            end if;
        end loop;

        -- Borrar el contenido operativo -- mismo alcance exacto que la
        -- orquestacion anterior en TypeScript.
        delete from public.problem_context where flow_attempt_id = r.flow_attempt_id;
        delete from public.partner_input where flow_attempt_id = r.flow_attempt_id;
        delete from public.partner_derived_profile where flow_attempt_id = r.flow_attempt_id;
        delete from public.previews where flow_attempt_id = r.flow_attempt_id;

        if exists (select 1 from public.waitlist where flow_attempt_id = r.flow_attempt_id) then
            delete from public.waitlist where flow_attempt_id = r.flow_attempt_id;
            v_waitlist_deleted := true;
        end if;
    end loop;

    -- Perfil propio, a nivel de usuario (no de intento) -- sin cambios
    -- de alcance.
    delete from public.user_birth_profile where user_id = p_user_id;

    return query select v_flow_attempts_affected, v_waitlist_deleted;
end;
$$;

-- =====================================================================
-- 9. purge_expired_free_text_consent_events(): redefinicion completa.
--    Opera sobre free_text_consent_cycles (nunca sobre eventos sueltos),
--    excluye siempre retention_hold = true, y usa FOR UPDATE SKIP
--    LOCKED para no competir con perform_delete_all_own_data() ni con
--    set_free_text_consent_cycle_retention_hold() -- si una fila ya esta
--    bloqueada por otra transaccion, esta pasada del cron simplemente
--    la salta (la recoge en la siguiente si sigue cumpliendo la
--    condicion de fecha).
-- =====================================================================
create or replace function public.purge_expired_free_text_consent_events()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_cycle record;
begin
    for v_cycle in
        select id, opened_seq, closed_seq
        from public.free_text_consent_cycles
        where ordinary_destroy_after is not null
          and ordinary_destroy_after < now()
          and not retention_hold
        order by id
        for update skip locked
    loop
        delete from public.free_text_consent_cycles where id = v_cycle.id;
        delete from public.free_text_consent_events
            where seq in (v_cycle.opened_seq, v_cycle.closed_seq);
    end loop;
end;
$$;

-- =====================================================================
-- 10. set_free_text_consent_cycle_retention_hold(): activa/libera la
--     conservacion excepcional de un ciclo CERRADO. Bloquea la fila con
--     FOR UPDATE antes de decidir: si purge_expired_free_text_consent_events()
--     ya la destruyo (SKIP LOCKED la deja pasar si esta funcion llego
--     primero, o esta funcion espera si el cron llego primero), al
--     reanudar encuentra que la fila ya no existe y falla
--     explicitamente -- nunca un exito silencioso que implique que
--     existe un hold sobre evidencia ya destruida.
-- =====================================================================
create or replace function public.set_free_text_consent_cycle_retention_hold(
    p_cycle_id uuid,
    p_hold boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_closed_seq bigint;
begin
    if p_hold then
        select closed_seq into v_closed_seq
            from public.free_text_consent_cycles
            where id = p_cycle_id
            for update;

        if not found then
            raise exception
                'free_text_consent_cycles no contiene ningun ciclo con id=% (puede haber sido ya destruido por la purga)',
                p_cycle_id;
        end if;

        if v_closed_seq is null then
            raise exception
                'No se puede activar un legal hold sobre un ciclo de consentimiento todavia abierto (cycle_id=%)',
                p_cycle_id;
        end if;

        -- Guard simetrico al de la rama de liberacion (abajo): si el
        -- hold ya estaba activo, esta UPDATE actualiza 0 filas y
        -- retention_hold_at NO se mueve -- una activacion repetida es
        -- idempotente, nunca sobrescribe la fecha de activacion
        -- original. 0 filas actualizadas aqui no es un error: el hold
        -- ya esta en el estado solicitado.
        update public.free_text_consent_cycles
        set retention_hold = true,
            retention_hold_at = now(),
            retention_hold_released_at = null
        where id = p_cycle_id and retention_hold = false;
    else
        perform 1 from public.free_text_consent_cycles
            where id = p_cycle_id
            for update;

        if not found then
            raise exception
                'free_text_consent_cycles no contiene ningun ciclo con id=% (puede haber sido ya destruido por la purga)',
                p_cycle_id;
        end if;

        update public.free_text_consent_cycles
        set retention_hold = false,
            retention_hold_released_at = now()
        where id = p_cycle_id and retention_hold = true;
    end if;
end;
$$;

-- =====================================================================
-- 11. Grants/revokes de las funciones.
-- =====================================================================
revoke all on function public.submit_problem_context_with_free_text(uuid, text, text, text)
    from public, anon, authenticated;
grant execute on function public.submit_problem_context_with_free_text(uuid, text, text, text)
    to service_role;

revoke all on function public.withdraw_free_text_consent(uuid)
    from public, anon, authenticated;
grant execute on function public.withdraw_free_text_consent(uuid)
    to service_role;

revoke all on function public.perform_delete_all_own_data(uuid)
    from public, anon, authenticated;
grant execute on function public.perform_delete_all_own_data(uuid)
    to service_role;

revoke all on function public.purge_expired_experiment_personal_data()
    from public, anon, authenticated, service_role;

revoke all on function public.purge_expired_free_text_consent_events()
    from public, anon, authenticated, service_role;

-- Deliberadamente SIN grant a service_role: ninguna ruta de la
-- aplicacion debe poder activar o liberar un legal hold. Se invoca
-- manualmente desde el SQL editor de Supabase, con un rol de
-- administracion de la propia plataforma (postgres/supabase_admin),
-- nunca con la service role key que usa el backend.
revoke all on function public.set_free_text_consent_cycle_retention_hold(uuid, boolean)
    from public, anon, authenticated, service_role;

-- =====================================================================
-- 12. Cron: esta migracion NO crea, modifica ni elimina ningun job de
--     pg_cron. El job purge-free-text-consent-events-expired fue creado
--     manualmente en una fase anterior -- antes de aplicar esta
--     migracion, verificar que sigue existiendo y que su "command"
--     sigue siendo exactamente
--     'select public.purge_expired_free_text_consent_events();' (sin
--     argumentos). Si coincide, el job no necesita ningun cambio: sigue
--     invocando la funcion por su mismo nombre, que esta migracion
--     redefine con create or replace (mismo patron ya usado para
--     purge_expired_experiment_personal_data() en
--     20260110000000_free_text_consent.sql).
-- =====================================================================
