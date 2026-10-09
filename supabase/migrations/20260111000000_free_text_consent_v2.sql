-- VEGA -- free_text_consent_versions: alta de v2 (aviso/checkbox
-- reformulados hacia minimizacion de identificadores directos, en vez
-- de prohibicion/enumeracion de categorias especiales -- decision de
-- producto 2026-10-10, ver documentacion/VEGA_Consentimiento_FreeText_v1.md
-- seccion 2 y 5). Incremental sobre 20260110000000_free_text_consent.sql.
--
-- Motivo: ProblemStep.tsx ya presenta este nuevo texto en el codigo de
-- la aplicacion, pero el catalogo seguia registrando cada grant nuevo
-- como consent_version = 'v1' -- cuyo notice_text/checkbox_text
-- almacenados son los ANTIGUOS. Eso es una discrepancia entre la
-- prueba de consentimiento (lo que el catalogo dice que se mostro) y
-- lo que realmente se mostro. Se resuelve dando de alta v2 como fila
-- nueva, nunca modificando v1 (append-only, mismo principio que
-- free_text_consent_events: ninguna fila de version ya publicada se
-- actualiza jamas).
--
-- v1 permanece intacta y valida: los eventos 'granted' ya registrados
-- bajo v1 siguen siendo una prueba de consentimiento correcta para el
-- texto que realmente se mostro en su momento. Esta migracion no
-- borra, modifica ni reinterpreta ningun evento historico.

do $$
declare
    v_existing_notice text;
    v_existing_checkbox text;
    v_notice text := 'Este campo es opcional. Cuéntanos solo lo necesario para entender tu situación. Evita incluir datos de contacto, documentos de identidad, direcciones u otros datos que permitan identificar directamente a otras personas.';
    v_checkbox text := 'Doy mi consentimiento para que Vega trate el texto que he escrito para generar mi interpretación personalizada, incluida cualquier información sensible sobre mí que decida compartir. Este consentimiento no se extiende a información sensible sobre otras personas.';
begin
    select notice_text, checkbox_text into v_existing_notice, v_existing_checkbox
        from public.free_text_consent_versions
        where version = 'v2';

    if v_existing_notice is null then
        insert into public.free_text_consent_versions (version, notice_text, checkbox_text, content_hash)
            values ('v2', v_notice, v_checkbox, md5(v_notice || v_checkbox));
    elsif v_existing_notice <> v_notice or v_existing_checkbox <> v_checkbox then
        raise exception 'free_text_consent_versions ya contiene v2 con un contenido distinto del esperado por esta migracion -- revisar antes de continuar, nunca reutilizar v2 para otro texto';
    end if;
    -- si existe y coincide exactamente, no hace nada: reaplicar esta
    -- migracion es seguro (mismo criterio idempotente-pero-no-silencioso
    -- que el seed de v1 en 20260110000000_free_text_consent.sql).
end $$;

-- No se modifica v1 ni ninguna fila de free_text_consent_events. No se
-- toca ninguna RPC: submit_problem_context_with_free_text() y
-- withdraw_free_text_consent() ya son agnosticas al valor concreto de
-- consent_version (lo reciben como parametro / lo leen del ultimo
-- evento), asi que siguen funcionando igual para v1 y para v2 sin
-- ningun cambio de definicion. No se tocan grants/revokes: ya cubren
-- la tabla completa, no fila a fila.
