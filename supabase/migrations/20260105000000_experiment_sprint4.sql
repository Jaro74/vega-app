-- VEGA Sprint 4 -- Paywall transparente + intencion de pago + waitlist.
-- Fuente: VEGA_Plan_Tecnico_Implementacion_Experimento.md, seccion
-- "priced_access_intents" / "waitlist" (SQL ya disenado ahi, lineas
-- 832-903). Aditiva: no toca ninguna tabla de Sprint 1/2/3A/3B.

-- Registro de intencion de pago confirmada (fake door, nunca un cobro
-- real). Unico por flow_attempt_id: un segundo intento del mismo usuario
-- devuelve la fila existente en vez de duplicar (idempotencia, encargo
-- Sprint 4 seccion 4 "Evita duplicados por refresh o doble clic").
create table if not exists public.priced_access_intents (
    id uuid primary key default gen_random_uuid(),

    flow_attempt_id uuid not null unique
        references public.flow_attempts(id)
        on delete cascade,

    price_minor integer not null default 999,
    currency char(3) not null default 'EUR',

    created_at timestamptz not null default now()
);

-- Lista de espera. email es el unico dato personal de esta tabla: vive
-- solo aqui, nunca en PostHog (libs/analytics/events.ts ya bloquea la
-- substring "email" en cualquier propiedad de evento). confirmation_status
-- soporta un futuro Database Webhook hacia n8n (fuera de este sprint,
-- igual que los cron jobs de purga de Sprint 3B: se deja la forma lista,
-- no se activa nada aqui).
create table if not exists public.waitlist (
    id uuid primary key default gen_random_uuid(),

    flow_attempt_id uuid not null unique
        references public.flow_attempts(id)
        on delete cascade,

    email text not null,

    -- Version de la finalidad concreta que el usuario acepto (checkbox
    -- explicito, ver WaitlistStep): "avisar cuando Vega abra acceso a la
    -- beta", nunca marketing. Validada server-side contra
    -- WAITLIST_CONSENT_VERSION (libs/experiment/constants.ts), no es un
    -- valor libre que mande el cliente.
    consent_version text not null,

    confirmation_status text not null
        default 'pending'
        check (
          confirmation_status in ('pending', 'sent', 'failed')
        ),

    created_at timestamptz not null default now()
);

create index if not exists idx_waitlist_email
    on public.waitlist(lower(email));

-- RLS + revocacion de grants, mismo patron que Sprint 1/2/3A/3B: el
-- navegador nunca consulta estas tablas directamente, solo el backend
-- (service_role, que bypassa RLS).
alter table public.priced_access_intents enable row level security;
alter table public.waitlist enable row level security;

revoke all on public.priced_access_intents from anon, authenticated;
revoke all on public.waitlist from anon, authenticated;

-- Nota de retencion (Sprint 4, seccion 9 del plan): a diferencia de
-- partner_input/partner_derived_profile, "waitlist" NO lleva una columna
-- delete_after ni un cron de purga automatica -- el email es la propia
-- finalidad del registro (contactar sobre la beta), no un dato accesorio.
-- Politica de retencion real y endpoint de supresion RGPD quedan
-- pendientes de revision legal antes de cualquier lanzamiento comercial.
