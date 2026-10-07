# VEGA — Decisión de Retención de Waitlist v1

**Estado:** Borrador aprobado para fase beta / validación  
**Aplicación:** Waitlist previa al lanzamiento público de Vega  
**Versión de consentimiento:** `waitlist_consent_v1`

---

## 1. Finalidad

La dirección de correo electrónico se recoge exclusivamente para:

- gestionar la lista de espera de Vega;
- avisar al usuario cuando el acceso al servicio esté disponible;
- gestionar, en su caso, una invitación de acceso durante la fase beta.

El email de la waitlist no se utilizará para newsletters, promociones, publicidad o comunicaciones comerciales sin un consentimiento independiente.

---

## 2. Base jurídica

La base prevista para este tratamiento es el consentimiento del usuario.

El usuario debe marcar expresamente la casilla correspondiente antes de enviar su email.

Texto de consentimiento actual:

> Acepto que Vega guarde mi email para avisarme cuando el acceso esté disponible.

---

## 3. Datos tratados

Para esta fase se pretende limitar el tratamiento a:

- dirección de correo electrónico;
- versión del consentimiento;
- fecha de alta;
- estado de confirmación;
- identificadores técnicos mínimos necesarios para vincular el alta al flujo del experimento.

No se utilizará el email como propiedad de eventos de analítica.

El email de la waitlist tampoco se envía a OpenAI: la generación de
previews (Vega/Railway + OpenAI) es un tratamiento técnico separado del
email, que solo se persiste en Supabase.

El email de la waitlist tampoco se envía a Railway/Vega: ese servicio
procesa únicamente los datos de nacimiento necesarios para generar la
evidencia astrológica (fecha, hora si se conoce, zona horaria y
coordenadas), en un flujo técnico separado del tratamiento del email de
waitlist.

---

## 4. Plazo de conservación

### Regla general

El email de waitlist se conservará durante un máximo de **12 meses desde el alta**.

### Supresión anticipada

Se eliminará antes cuando:

- el usuario retire su consentimiento;
- el usuario solicite la supresión;
- deje de existir la finalidad para la que fue recogido.

### Después de enviar una invitación

Una vez enviada una invitación de acceso, el email podrá mantenerse durante un máximo de **90 días** para gestionar esa invitación.

Si el usuario pasa a ser usuario de Vega, el tratamiento de sus datos se regirá por la política de privacidad aplicable al servicio completo.

---

## 5. Implementación técnica

La tabla `waitlist` incorpora un campo de expiración, implementado y
verificado mediante la migración
`supabase/migrations/20260106000000_experiment_waitlist_retention.sql`:

- `expires_at timestamptz not null`, con `default (now() + interval
  '12 months')` para las filas nuevas.
- Las filas ya existentes antes de la migración recibieron, mediante un
  backfill explícito, `expires_at = created_at + interval '12 months'`
  — su propio `created_at`, no una fecha calculada a partir del momento
  de la migración.
- Índice dedicado `idx_waitlist_expires` sobre esa columna.
- Función `public.purge_expired_waitlist_entries()`, con `security
  definer` y `search_path` fijado a `public`, que borra las filas con
  `expires_at < now()`. Sin permiso `EXECUTE` para `public`, `anon` ni
  `authenticated`.
- La función se probó dentro de una transacción con una única fila
  sintética ya caducada: la fila sintética se eliminó correctamente al
  invocar la función, y un `ROLLBACK` posterior dejó la base sin ningún
  dato de prueba.
- La limpieza periódica se programó manualmente en Supabase mediante
  `pg_cron` (fuera de esta migración, mismo patrón operativo que
  `partner_input`): `jobname = purge-waitlist-expired`, `schedule = 0 3
  * * *`, `command = select public.purge_expired_waitlist_entries();`,
  `active = true`.

No incluye todavía la lógica del plazo de 90 días tras una invitación de
acceso (sección 4, "Después de enviar una invitación") — esa invitación
no existe hoy como funcionalidad real del producto.

Esta tabla queda fuera, a propósito, de la retención de 30 días del
núcleo de datos personales del flujo de exploración (`problem_context`,
`user_birth_profile`, `previews`, `partner_derived_profile` —
implementada mediante
`supabase/migrations/20260107000000_experiment_personal_data_retention.sql`;
ver `VEGA_Politica_Privacidad_Beta_v1.md`, sección 5, y
`VEGA_Plan_Tecnico_Implementacion_Experimento.md`, sección 11).
`waitlist` mantiene sus 12 meses propios precisamente porque el email
es la propia finalidad del registro, no un dato accesorio del flujo de
onboarding. `priced_access_intents` tampoco está cubierto por esa
política de 30 días — tiene su propia retención ya implementada: se
conserva durante el experimento, con un límite máximo automático de 12
meses como red de seguridad (`expires_at`,
`purge_expired_priced_access_intents()`, cron
`purge-priced-access-intents-expired` diario), y una purga manual
prevista al cierre del experimento, una vez guardada la métrica final.

---

## 6. Marketing

La waitlist no autoriza:

- newsletters;
- promociones;
- ofertas comerciales;
- publicidad;
- comunicaciones distintas del aviso de disponibilidad y gestión de la beta.

Cualquier uso posterior de marketing requerirá una base jurídica y un consentimiento separados.

---

## 7. Responsable del tratamiento

La intención es que el responsable definitivo sea una **sociedad pendiente de constitución**.

Antes de abrir la waitlist a usuarios reales deberán completarse:

- razón social;
- NIF;
- domicilio;
- email de privacidad;
- datos de contacto del responsable.

Hasta ese momento, esta decisión se considera de diseño interno y no una política pública definitiva.

---

## 8. Estado y revisión

Esta decisión es válida únicamente para la fase beta / waitlist.

Debe revisarse cuando cambie cualquiera de estos elementos:

- finalidad de la waitlist;
- datos recogidos;
- proveedores;
- modelo de cuenta de usuario;
- comunicaciones comerciales;
- proceso de invitación;
- producto Vega completo.

---

## 9. Próximo paso

Implementar esta decisión en:

- esquema de Supabase;
- proceso de retención;
- política de privacidad beta — **completado** (ver sección 5 de este
  documento y `VEGA_Politica_Privacidad_Beta_v1.md`, sección 5);
- enlace de privacidad de la waitlist;
- textos de consentimiento.
