-- VEGA -- Segmento B: contexto estructurado cerrado, retirada completa
-- del texto libre (encargo "eliminar free_text de Segmento B").
--
-- 1) Añade relationship_focus / user_emotional_state / impact_intensity
--    a problem_context (Segmento B unicamente -- Segmento A conserva su
--    arquitectura v2 del free_text exactamente igual, sin tocar).
-- 2) Limpia historicamente free_text/text_provided en los problem_context
--    de Segmento B (la aplicacion ya no vuelve a escribir ahi para B).
-- 3) Cierra, con el nuevo close_reason/action 'purpose_ended', los ciclos
--    de consentimiento de Segmento B que sigan abiertos -- respetando
--    cualquier cierre legitimo concurrente (withdrawn/expired/
--    erasure_requested) que haya llegado antes.
-- 4) Redefine withdraw_free_text_consent() para reconocer 'purpose_ended'
--    explicitamente (devuelve already_ended) en vez de caer en el
--    "else: raise exception" que asumia que solo erasure_requested podia
--    llegar ahi.
--
-- NO toca: free_text_consent_events ni free_text_consent_cycles de
-- Segmento A, ningun evento/ciclo existente (solo se CIERRAN los 3
-- abiertos de B, nunca se borran), ni purge_expired_experiment_personal_data(),
-- purge_expired_free_text_consent_events() ni perform_delete_all_own_data()
-- (auditadas: ya manejan 'purpose_ended' correctamente por su logica ya
-- generica, sin necesitar cambios -- ver conversacion de diseño).
--
-- Nombres reales de constraint confirmados contra Supabase (pg_constraint):
--   free_text_consent_events_action_check
--   free_text_consent_cycles_close_reason_check
--
-- Idempotente por construccion: cada UPDATE/INSERT solo actua sobre filas
-- que todavia necesitan el cambio (WHERE ... IS NULL / free_text IS NOT
-- NULL / closed_seq IS NULL) -- ninguna prevalidacion exige un recuento
-- exacto tomado de un preflight puntual (evita falsos abortos por
-- actividad legitima entre el preflight y esta migracion). Las
-- postvalidaciones verifican invariantes (0 ciclos de B abiertos al
-- terminar, purpose_ended nunca en Segmento A, ningun closed_seq
-- duplicado), nunca conteos historicos exactos.
--
-- DDL + DML en una unica transaccion explicita -- no se depende de que
-- el SQL Editor de Supabase envuelva el script completo por su cuenta.

BEGIN;

-- =====================================================================
-- 0. Notas informativas (nunca abortan): recuento de lo que esta
--    migracion va a tocar, para revisión manual del resultado.
-- =====================================================================
do $$
declare
  v_pending_text_cleanup integer;
  v_open_b_cycles integer;
begin
  select count(*) into v_pending_text_cleanup
    from public.problem_context pc
    join public.flow_attempts fa on fa.id = pc.flow_attempt_id
    where fa.segment = 'B' and (pc.free_text is not null or pc.text_provided = true);

  select count(*) into v_open_b_cycles
    from public.free_text_consent_cycles c
    join public.flow_attempts fa on fa.id = c.flow_attempt_id
    where fa.segment = 'B' and c.closed_seq is null;

  raise notice 'problem_context de Segmento B pendientes de limpiar: % (0 = ya aplicado antes)', v_pending_text_cleanup;
  raise notice 'ciclos de Segmento B abiertos a cerrar: % (0 = ya aplicado antes, o todos cerrados legitimamente desde entonces)', v_open_b_cycles;
end $$;

-- =====================================================================
-- 1. Contexto estructurado de Segmento B -- aditivo, nullable.
-- =====================================================================
alter table public.problem_context
  add column if not exists relationship_focus text,
  add column if not exists user_emotional_state text,
  add column if not exists impact_intensity smallint;

alter table public.problem_context
  drop constraint if exists problem_context_relationship_focus_check,
  add constraint problem_context_relationship_focus_check
    check (relationship_focus is null or relationship_focus in (
      'communication', 'emotional_closeness', 'trust_security',
      'current_change', 'repeating_pattern', 'navigating_relationship'
    ));

alter table public.problem_context
  drop constraint if exists problem_context_user_emotional_state_check,
  add constraint problem_context_user_emotional_state_check
    check (user_emotional_state is null or user_emotional_state in (
      'confused', 'insecure', 'distant', 'frustrated',
      'blocked', 'hopeful', 'calm', 'curious'
    ));

alter table public.problem_context
  drop constraint if exists problem_context_impact_intensity_check,
  add constraint problem_context_impact_intensity_check
    check (impact_intensity is null or impact_intensity between 1 and 5);

-- =====================================================================
-- 2. Nuevo action/close_reason 'purpose_ended' -- aditivo sobre los
--    catalogos existentes, nombres de constraint verificados contra
--    Supabase real.
-- =====================================================================
alter table public.free_text_consent_events
  drop constraint free_text_consent_events_action_check,
  add constraint free_text_consent_events_action_check
    check (action in ('granted', 'withdrawn', 'expired', 'erasure_requested', 'purpose_ended'));

alter table public.free_text_consent_cycles
  drop constraint free_text_consent_cycles_close_reason_check,
  add constraint free_text_consent_cycles_close_reason_check
    check (close_reason is null or close_reason in ('withdrawn', 'expired', 'erasure_requested', 'purpose_ended'));

-- =====================================================================
-- 3. withdraw_free_text_consent(): reconoce 'purpose_ended' de forma
--    explicita (already_ended), en vez de caer en el "else: raise
--    exception" que documentadamente solo esperaba erasure_requested
--    ahi (ese sí es estructuralmente imposible, porque se bloquea en el
--    mismo paso; purpose_ended NO bloquea, por eso SI puede llegar aqui).
--    Resto de la funcion sin cambios de comportamiento.
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

    select id, closed_seq, close_reason, consent_version into v_cycle
        from public.active_free_text_consent_cycles
        where flow_attempt_id = p_flow_attempt_id
        order by opened_seq desc
        limit 1;

    if not found then
        return query select 'no_consent'::text, 0;
        return;
    end if;

    if v_cycle.closed_seq is not null then
        if v_cycle.close_reason = 'withdrawn' then
            return query select 'already_withdrawn'::text, 0;
        elsif v_cycle.close_reason = 'expired' then
            return query select 'already_expired'::text, 0;
        elsif v_cycle.close_reason = 'purpose_ended' then
            return query select 'already_ended'::text, 0;
        else
            raise exception 'close_reason inesperado en ciclo activo no abierto (cycle_id=%, close_reason=%)', v_cycle.id, v_cycle.close_reason;
        end if;
        return;
    end if;

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
-- 4. Cierre de los ciclos de Segmento B todavia abiertos.
--
--    Concurrencia: usa el mismo lock canonico que el resto de funciones
--    de esta cadena (`flow_attempts for update`) -- como todas compiten
--    por la MISMA fila para el mismo flow_attempt_id, Postgres las
--    serializa: si withdraw_free_text_consent()/perform_delete_all_own_data()
--    ya tiene el lock, esta migracion espera a que termine (commit) antes
--    de continuar, y al releer el ciclo YA bajo su propio lock ve el
--    cierre legitimo ya aplicado -- nunca un estado a medias.
--
--    Por eso la decision de accion se toma con una RELECTURA EN VIVO
--    despues de adquirir el lock, nunca con la fila leida en el cursor
--    inicial (esa lectura inicial es solo para saber que flow_attempt_id
--    visitar).
-- =====================================================================
do $$
declare
  v_candidate record;
  v_live record;
  v_new_seq bigint;
  v_closed_by_us integer := 0;
  v_already_closed_by_other integer := 0;
begin
  for v_candidate in
    select c.id as cycle_id, c.flow_attempt_id
    from public.free_text_consent_cycles c
    join public.flow_attempts fa on fa.id = c.flow_attempt_id
    where fa.segment = 'B' and c.closed_seq is null
    order by c.flow_attempt_id
  loop
    perform 1 from public.flow_attempts where id = v_candidate.flow_attempt_id for update;

    select id, closed_seq, close_reason, lifecycle_state, consent_version into v_live
      from public.free_text_consent_cycles
      where id = v_candidate.cycle_id
      for update;

    if v_live.closed_seq is not null then
      -- Cerrado legitimamente por otra operacion (withdraw/expired/
      -- erasure_requested) entre la lectura inicial y la adquisicion del
      -- lock -- se respeta, nunca se sobrescribe con purpose_ended.
      v_already_closed_by_other := v_already_closed_by_other + 1;
      continue;
    end if;

    -- Defensa en profundidad: estado estructuralmente imposible segun
    -- los propios CHECK de la tabla (closed_seq is null exige
    -- lifecycle_state = 'active'), revalidado explicitamente de todas
    -- formas.
    if v_live.lifecycle_state <> 'active' then
      raise exception 'Estado inconsistente: ciclo % (flow_attempt_id=%) abierto con lifecycle_state=%',
        v_live.id, v_candidate.flow_attempt_id, v_live.lifecycle_state;
    end if;

    insert into public.free_text_consent_events (flow_attempt_id, action, consent_version)
      values (v_candidate.flow_attempt_id, 'purpose_ended', v_live.consent_version)
      returning seq into v_new_seq;

    -- purpose_ended NO bloquea el ciclo (lifecycle_state sigue 'active') --
    -- a diferencia de erasure_requested, no es una supresion, es el fin
    -- de la finalidad para la que se pidio el consentimiento.
    update public.free_text_consent_cycles
      set closed_seq = v_new_seq,
          close_reason = 'purpose_ended',
          ordinary_destroy_after = now() + interval '36 months'
      where id = v_live.id;

    v_closed_by_us := v_closed_by_us + 1;
  end loop;

  raise notice 'Ciclos de Segmento B cerrados con purpose_ended: %. Ya cerrados legitimamente por otra operacion: %.',
    v_closed_by_us, v_already_closed_by_other;
end $$;

-- =====================================================================
-- 5. Limpieza historica de problem_context -- idempotente por el WHERE,
--    solo Segmento B, nunca toca trigger/created_at/delete_after ni
--    ninguna fila de Segmento A.
-- =====================================================================
update public.problem_context pc
set free_text = null,
    text_provided = false
from public.flow_attempts fa
where fa.id = pc.flow_attempt_id
  and fa.segment = 'B'
  and (pc.free_text is not null or pc.text_provided = true);

-- =====================================================================
-- 6. Postvalidaciones por invariantes (nunca por conteos historicos
--    exactos). Si cualquiera falla, la transaccion completa se revierte.
-- =====================================================================
do $$
declare
  v_remaining_text_b integer;
  v_still_open_b integer;
  v_purpose_ended_on_a integer;
  v_duplicate_closed_seq integer;
begin
  select count(*) into v_remaining_text_b
    from public.problem_context pc
    join public.flow_attempts fa on fa.id = pc.flow_attempt_id
    where fa.segment = 'B' and (pc.free_text is not null or pc.text_provided = true);
  if v_remaining_text_b > 0 then
    raise exception 'Postvalidacion fallida: quedan % problem_context de Segmento B con texto o text_provided=true', v_remaining_text_b;
  end if;

  select count(*) into v_still_open_b
    from public.free_text_consent_cycles c
    join public.flow_attempts fa on fa.id = c.flow_attempt_id
    where fa.segment = 'B' and c.closed_seq is null;
  if v_still_open_b > 0 then
    raise exception 'Postvalidacion fallida: quedan % ciclos de Segmento B sin cerrar', v_still_open_b;
  end if;

  select count(*) into v_purpose_ended_on_a
    from public.free_text_consent_cycles c
    join public.flow_attempts fa on fa.id = c.flow_attempt_id
    where fa.segment = 'A' and c.close_reason = 'purpose_ended';
  if v_purpose_ended_on_a > 0 then
    raise exception 'Postvalidacion fallida: % ciclo(s) de Segmento A con close_reason=purpose_ended -- no deberia existir ninguno', v_purpose_ended_on_a;
  end if;

  select count(*) into v_duplicate_closed_seq
    from (
      select closed_seq from public.free_text_consent_cycles
      where closed_seq is not null
      group by closed_seq having count(*) > 1
    ) dup;
  if v_duplicate_closed_seq > 0 then
    raise exception 'Postvalidacion fallida: % closed_seq duplicado(s) entre ciclos -- evento terminal usado mas de una vez', v_duplicate_closed_seq;
  end if;
end $$;

COMMIT;
