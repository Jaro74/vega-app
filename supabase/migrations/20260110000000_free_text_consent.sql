-- VEGA -- consentimiento especifico para problem_context.free_text
-- (art. 6.1.a / 9.2.a cuando proceda, tras el analisis de
-- categorias especiales de terceros). Aditiva: no toca
-- experiment_users, flow_attempts, user_birth_profile, partner_input,
-- partner_derived_profile ni waitlist. Redefine unicamente
-- purge_expired_experiment_personal_data() (mismo nombre y firma; el
-- cron diario existente que la llama sigue funcionando sin cambios).
--
-- No crea ningun pg_cron -- el job horario para
-- purge_expired_free_text_consent_events() se crea aparte,
-- manualmente, una vez verificada esta migracion (mismo patron
-- operativo que el resto del proyecto: ver
-- 20260109000000_segment_b_retention_reduction.sql, punto 5).
--
-- Semantica de retencion fijada en esta migracion: los 30 dias de
-- free_text cuentan desde su ULTIMA escritura valida (no desde la
-- creacion original de problem_context) -- cada edicion bajo
-- consentimiento vigente renueva delete_after; created_at nunca se
-- modifica. La inconsistencia del upsert simple sin free_text
-- (upsertProblemContext, que no refresca delete_after al actualizar
-- solo el trigger) queda fuera de esta migracion, anotada como
-- cuestion separada sobre la retencion de trigger.

-- 1. Catalogo de versiones de texto mostrado al usuario (aviso +
-- checkbox del free_text). Nunca se actualiza una version ya
-- publicada, solo se inserta una nueva -- cualquier cambio futuro de
-- copy crea v2, v3, etc. content_hash es un control de integridad
-- opcional, no una garantia de inmutabilidad: la proteccion real es
-- la misma que el resto de tablas del experimento (RLS + grants
-- revocados, solo accesible via backend).
create table if not exists public.free_text_consent_versions (
    version text primary key,
    notice_text text not null,
    checkbox_text text not null,
    effective_from timestamptz not null default now(),
    content_hash text
);

alter table public.free_text_consent_versions enable row level security;

-- 2. Seed de v1 -- antes de crear free_text_consent_events, para que
-- ningun despliegue de codigo que registre consent_version = 'v1'
-- pueda llegar a ejecutarse con la FK valida pero sin la fila
-- correspondiente. Idempotente pero no silencioso: si v1 ya existiera
-- con un contenido distinto del esperado aqui, la migracion aborta en
-- vez de continuar con una discrepancia sin detectar.
do $$
declare
    v_existing_notice text;
    v_existing_checkbox text;
    v_notice text := 'Este campo es opcional: puedes continuar sin rellenarlo. No introduzcas datos de salud, orientación o vida sexual, religión o creencias, origen racial o étnico, afiliación sindical, ni datos genéticos o biométricos — ni tuyos ni de ninguna otra persona. Si decides incluir alguno de estos datos sobre ti mismo, tu consentimiento explícito (casilla de abajo) nos permite tratarlo, exclusivamente para generar tu interpretación personalizada. Ese consentimiento no puede autorizar, en ningún caso, el tratamiento de esos mismos datos si pertenecen a otra persona — el RGPD exige que sea esa persona, y no tú, quien los consienta.';
    v_checkbox text := 'Doy mi consentimiento para que Vega trate el texto que he escrito arriba, incluida cualquier información sobre salud, orientación o vida sexual, religión o creencias, origen racial o étnico, afiliación sindical, o datos genéticos o biométricos que sean míos y que haya decidido incluir, con la única finalidad de generar mi interpretación personalizada. Este consentimiento no cubre el tratamiento de esos datos cuando pertenezcan a otra persona.';
begin
    select notice_text, checkbox_text into v_existing_notice, v_existing_checkbox
        from public.free_text_consent_versions
        where version = 'v1';

    if v_existing_notice is null then
        insert into public.free_text_consent_versions (version, notice_text, checkbox_text, content_hash)
            values ('v1', v_notice, v_checkbox, md5(v_notice || v_checkbox));
    elsif v_existing_notice <> v_notice or v_existing_checkbox <> v_checkbox then
        raise exception 'free_text_consent_versions ya contiene v1 con un contenido distinto del esperado por esta migracion -- revisar antes de continuar, nunca reutilizar v1 para otro texto';
    end if;
    -- si existe y coincide exactamente, no hace nada: reaplicar esta
    -- migracion es seguro.
end $$;

-- 3. Historial append-only de eventos de consentimiento. seq (bigint
-- identity) es la unica fuente de orden -- created_at es informativo,
-- nunca se usa para decidir secuencia. Se desvia a proposito del
-- patron uuid-PK del resto del proyecto: aqui el PK tiene que SER el
-- propio mecanismo de orden.
create table if not exists public.free_text_consent_events (
    seq bigint generated always as identity primary key,
    flow_attempt_id uuid not null references public.flow_attempts(id)
        on delete cascade,
    action text not null
        check (action in ('granted', 'withdrawn', 'expired')),
    consent_version text not null
        references public.free_text_consent_versions(version),
    created_at timestamptz not null default now()
);

create index if not exists idx_free_text_consent_events_flow_attempt
    on public.free_text_consent_events(flow_attempt_id, seq);

alter table public.free_text_consent_events enable row level security;

-- 4. previews: marca en el momento de generacion si un preview
-- dependio del free_text de problem_context -- necesario para la
-- supresion selectiva al retirar el consentimiento. Se fija una sola
-- vez, en generatePreviewForFlowAttempt; nunca se recalcula despues
-- (problem_context.free_text puede cambiar o borrarse mas adelante).
alter table public.previews
    add column if not exists used_free_text boolean not null default false;

-- 5. Alta/actualizacion atomica de problem_context + consentimiento
-- del free_text. Lock canonico sobre flow_attempts (siempre existe
-- para un flow_attempt_id valido, incluso cuando problem_context
-- todavia no tiene fila): serializa esta funcion frente a
-- withdraw_free_text_consent() y frente a la expiracion dentro de
-- purge_expired_experiment_personal_data() para el mismo intento,
-- cerrando la carrera del primer grant concurrente.
--
-- Maquina de estados sobre el ultimo evento por seq:
--   ninguno / withdrawn / expired -> nuevo 'granted'
--   granted, misma consent_version -> solo actualiza texto, sin evento nuevo
--   granted, consent_version distinta -> 'version_conflict', no escribe nada
--
-- delete_after se renueva a 30 dias desde AHORA en cada escritura
-- valida (primer grant, edicion bajo la misma version, o nuevo grant
-- tras withdrawn/expired) -- nunca hereda el plazo de una escritura
-- anterior. created_at nunca se toca.
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
    v_last_action text;
    v_last_version text;
begin
    if p_free_text is null or btrim(p_free_text) = '' then
        raise exception 'submit_problem_context_with_free_text exige un free_text no vacio; usar el upsert simple cuando no hay texto';
    end if;

    if p_consent_version is null then
        raise exception 'submit_problem_context_with_free_text requiere consent_version cuando se proporciona free_text';
    end if;

    perform 1 from public.flow_attempts
        where id = p_flow_attempt_id
        for update;

    select action, consent_version into v_last_action, v_last_version
        from public.free_text_consent_events
        where flow_attempt_id = p_flow_attempt_id
        order by seq desc
        limit 1;

    if v_last_action is null or v_last_action in ('withdrawn', 'expired') then
        insert into public.free_text_consent_events (flow_attempt_id, action, consent_version)
            values (p_flow_attempt_id, 'granted', p_consent_version);

    elsif v_last_action = 'granted' and v_last_version = p_consent_version then
        null;

    elsif v_last_action = 'granted' and v_last_version <> p_consent_version then
        return query select 'version_conflict'::text;
        return;
    end if;

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

-- 6. Retirada atomica. Mismo lock canonico sobre flow_attempts.
-- Decide exclusivamente por el ultimo evento por seq: solo si es
-- 'granted' borra las previews dependientes (used_free_text = true),
-- limpia free_text/text_provided e inserta el 'withdrawn'
-- correspondiente, con la misma consent_version del ultimo granted
-- (nunca recibida desde fuera). Idempotente: no_consent /
-- already_withdrawn / already_expired para los demas casos.
create or replace function public.withdraw_free_text_consent(
    p_flow_attempt_id uuid
)
returns table (outcome text, previews_deleted integer)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_last_action text;
    v_last_version text;
    v_deleted_count integer := 0;
begin
    perform 1 from public.flow_attempts
        where id = p_flow_attempt_id
        for update;

    select action, consent_version into v_last_action, v_last_version
        from public.free_text_consent_events
        where flow_attempt_id = p_flow_attempt_id
        order by seq desc
        limit 1;

    if v_last_action is null then
        return query select 'no_consent'::text, 0;
        return;
    end if;

    if v_last_action = 'withdrawn' then
        return query select 'already_withdrawn'::text, 0;
        return;
    end if;

    if v_last_action = 'expired' then
        return query select 'already_expired'::text, 0;
        return;
    end if;

    -- v_last_action = 'granted' desde aqui.
    delete from public.previews
        where flow_attempt_id = p_flow_attempt_id and used_free_text = true;
    get diagnostics v_deleted_count = row_count;

    update public.problem_context
        set free_text = null, text_provided = false
        where flow_attempt_id = p_flow_attempt_id;

    insert into public.free_text_consent_events (flow_attempt_id, action, consent_version)
        values (p_flow_attempt_id, 'withdrawn', v_last_version);

    return query select 'withdrawn'::text, v_deleted_count;
end;
$$;

-- 7. Purga de ciclos cerrados (granted + su withdrawn/expired) 12
-- meses despues del evento terminal -- politica provisional, nivel de
-- confianza moderado-alto (ver analisis de retencion previo). Un
-- ciclo sin evento terminal (el granted mas reciente, activo) nunca
-- aparece aqui: un nuevo granted abre un nuevo ciclo de forma
-- estructural, no por convencion.
create or replace function public.purge_expired_free_text_consent_events()
returns void
language sql
security definer
set search_path = public
as $$
  with closed_cycles as (
    select
      e.seq as terminal_seq,
      e.flow_attempt_id,
      (
        select g.seq from public.free_text_consent_events g
        where g.flow_attempt_id = e.flow_attempt_id
          and g.action = 'granted'
          and g.seq < e.seq
        order by g.seq desc
        limit 1
      ) as granted_seq
    from public.free_text_consent_events e
    where e.action in ('withdrawn', 'expired')
      and e.created_at < now() - interval '12 months'
  )
  delete from public.free_text_consent_events
  where seq in (
    select terminal_seq from closed_cycles
    union
    select granted_seq from closed_cycles where granted_seq is not null
  );
$$;

-- 8. Redefinicion final de purge_expired_experiment_personal_data()
-- (mismo nombre y firma que la version de
-- 20260107000000_experiment_personal_data_retention.sql / 20260109000000_segment_b_retention_reduction.sql;
-- el cron diario existente la sigue llamando sin cambios).
--
-- Cambios respecto a la version anterior:
--   - problem_context se procesa fila a fila, bajo el mismo lock
--     canonico sobre flow_attempts que usan submit_problem_context_with_free_text()
--     y withdraw_free_text_consent() -- serializa expiracion frente a
--     grant/retirada concurrentes sobre el mismo flow_attempt_id;
--   - tras adquirir el lock, relee delete_after: si el dato fue
--     renovado mientras se esperaba, salta esa fila sin tocarla;
--   - solo inserta 'expired' si el ultimo evento sigue siendo
--     'granted' Y text_provided = true en el momento de la relectura.
-- user_birth_profile y previews conservan el DELETE masivo de siempre
-- -- no tienen ningun mecanismo de renovacion equivalente, no existe
-- la misma carrera para ellas.
create or replace function public.purge_expired_experiment_personal_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    r record;
    v_last_action text;
    v_last_version text;
    v_text_provided boolean;
    v_delete_after timestamptz;
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

        select action, consent_version into v_last_action, v_last_version
            from public.free_text_consent_events
            where flow_attempt_id = r.flow_attempt_id
            order by seq desc
            limit 1;

        if v_last_action = 'granted' and v_text_provided = true then
            insert into public.free_text_consent_events (flow_attempt_id, action, consent_version)
                values (r.flow_attempt_id, 'expired', v_last_version);
        end if;

        delete from public.problem_context where flow_attempt_id = r.flow_attempt_id;
    end loop;

    delete from public.user_birth_profile where delete_after < now();
    delete from public.previews where delete_after < now();
end;
$$;

-- 9. Grants/revokes definitivos. Mismo patron que el resto del
-- proyecto: RLS activada sin policies para anon/authenticated, todo
-- el acceso via backend con la service role key. Las dos RPC
-- invocadas desde el backend reciben ademas un GRANT EXECUTE
-- explicito a service_role; las funciones de cron no necesitan
-- exposicion al cliente, solo revoke.
revoke all on public.free_text_consent_versions from anon, authenticated;
revoke all on public.free_text_consent_events from anon, authenticated;

revoke all on function public.submit_problem_context_with_free_text(uuid, text, text, text)
    from public, anon, authenticated;
grant execute on function public.submit_problem_context_with_free_text(uuid, text, text, text)
    to service_role;

revoke all on function public.withdraw_free_text_consent(uuid)
    from public, anon, authenticated;
grant execute on function public.withdraw_free_text_consent(uuid)
    to service_role;

revoke all on function public.purge_expired_free_text_consent_events()
    from public, anon, authenticated;

revoke all on function public.purge_expired_experiment_personal_data()
    from public, anon, authenticated;

-- 10. Cron: NO se crea, modifica ni elimina ningun job de pg_cron en
-- esta migracion (mismo patron operativo que el resto del proyecto).
-- Queda pendiente, como paso manual en el dashboard de Supabase, una
-- vez verificada esta migracion: crear un nuevo job horario (p. ej.
-- jobname = purge-free-text-consent-events-expired,
-- schedule = '0 * * * *', command =
-- 'select public.purge_expired_free_text_consent_events();'). El cron
-- diario existente (purge-experiment-personal-data-expired) no
-- necesita ningun cambio: sigue llamando a
-- purge_expired_experiment_personal_data() por su mismo nombre.
