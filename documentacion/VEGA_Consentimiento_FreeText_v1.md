# VEGA — Consentimiento específico del texto libre (free_text)

Estado: implementado (código) sobre la migración `supabase/migrations/20260110000000_free_text_consent.sql`, verificada manualmente en Supabase (v1 presente, tablas/FKs/RPCs/permisos correctos, smoke test pasado, cron `purge-free-text-consent-events-expired` activo). Tráfico real sigue suspendido (`EXPERIMENT_ACCEPTING_REAL_TRAFFIC = false`).

## 1. Problema jurídico

`problem_context.free_text` (Segmento A y B) es un campo opcional de texto libre. A diferencia de `user_birth_profile`/`trigger` (interés legítimo, art. 6.1.f — ver sección 4 de `VEGA_Politica_Privacidad_Beta_v1.md`), el free_text puede llegar a contener una categoría especial del art. 9 RGPD, propia del usuario o, pese a la prohibición expresa, de un tercero mencionado en el texto. El art. 6.1.f nunca elimina la prohibición del art. 9.1: si existe tratamiento de una categoría especial, hace falta además una excepción aplicable del art. 9.2.

Conclusión de diseño (Opción D, cerrada tras varias rondas de revisión):

- `user_birth_profile` → 6.1.f.
- `trigger` → 6.1.f.
- `free_text` → 6.1.a (ordinario) y, cuando el usuario incluye una categoría especial **propia**, 9.2.a (explícito).
- `previews` → hereda la base del free_text si lo usó (`used_free_text`); en caso contrario, solo interés legítimo.
- Categorías especiales de **terceros** introducidas pese a la prohibición: Vega no dispone actualmente de una excepción del art. 9.2 que pueda invocar de forma general, predecible y adecuada para ese supuesto. Se mitiga con un filtro técnico (reduce la frecuencia, nunca la elimina) — punto pendiente de consulta jurídica externa antes de abrir tráfico real.

## 2. Texto UX exacto (versión `v1`)

**Explicativo previo** (antes del textarea):
> Este campo es opcional: puedes continuar sin rellenarlo. No introduzcas datos de salud, orientación o vida sexual, religión o creencias, origen racial o étnico, afiliación sindical, ni datos genéticos o biométricos — ni tuyos ni de ninguna otra persona. Si decides incluir alguno de estos datos sobre ti mismo, tu consentimiento explícito (casilla de abajo) nos permite tratarlo, exclusivamente para generar tu interpretación personalizada. Ese consentimiento no puede autorizar, en ningún caso, el tratamiento de esos mismos datos si pertenecen a otra persona — el RGPD exige que sea esa persona, y no tú, quien los consienta.

**Checkbox** (no premarcado, separado de cualquier otro consentimiento):
> Doy mi consentimiento para que Vega trate el texto que he escrito arriba, incluida cualquier información sobre salud, orientación o vida sexual, religión o creencias, origen racial o étnico, afiliación sindical, o datos genéticos o biométricos que sean míos y que haya decidido incluir, con la única finalidad de generar mi interpretación personalizada. Este consentimiento no cubre el tratamiento de esos datos cuando pertenezcan a otra persona.

Mensaje de error si falta consentimiento: *"Para guardar este texto necesitamos tu consentimiento explícito — marca la casilla de arriba, o borra el texto si prefieres continuar sin él."*

Mensaje si el filtro bloquea el texto: *"Parece que este texto puede incluir datos sobre otra persona. Por favor, edítalo para hablar solo de tu propia situación."*

Texto de retirada (en `/mis-datos`): *"Puedes retirar este consentimiento cuando quieras. Al hacerlo, borraremos el texto que escribiste y cualquier interpretación que lo haya utilizado — el resto de tus datos no se verá afectado."*

Esta versión (`v1`) está sembrada en `free_text_consent_versions` por la propia migración. Un cambio material de este texto crea `v2`, nunca reutiliza `v1`.

## 3. Modelo técnico

- `free_text_consent_versions`: catálogo del texto exacto por versión (`notice_text`, `checkbox_text`, `content_hash` opcional como control de integridad, no como garantía de inmutabilidad).
- `free_text_consent_events`: historial append-only (`seq` monotónico, `action` en `granted|withdrawn|expired`, `consent_version`). El estado vigente es siempre el último evento por `seq` — nunca una reconstrucción separada de "último granted" + "¿hay un withdrawn después?".
- `previews.used_free_text`: fijado en el momento de generación (nunca recalculado), necesario para saber qué previews borrar al retirar el consentimiento.
- `submit_problem_context_with_free_text()` / `withdraw_free_text_consent()`: RPCs `security definer`, atómicas, bloqueando siempre `flow_attempts` (lock canónico que existe incluso antes de que haya fila en `problem_context`) — serializan grant/retirada/expiración automática del mismo intento.
- `purge_expired_experiment_personal_data()`: inserta `expired` antes de borrar una fila de `problem_context` cuyo último evento siga siendo `granted`, bajo el mismo lock.
- `purge_expired_free_text_consent_events()`: purga ciclos ya cerrados (granted + su withdrawn/expired) 12 meses después del evento terminal — política provisional, no excluye por defecto esta tabla de `/delete-all`; una excepción del art. 17.3.e solo se aplicaría caso por caso, con un indicio concreto de reclamación, nunca de forma preventiva y general.

## 4. Capa de aplicación

- `libs/experiment/third-party-sensitive-text-filter.ts`: módulo puro, único, compartido por cliente y servidor. Bloquea solo cuando coexisten un término de categoría especial y un marcador de tercera persona.
- `submitProblem` (`libs/experiment/onboarding-service.ts`): sin texto → upsert simple (sin cambios). Con texto → exige consentimiento, aplica el filtro, delega en `submitProblemContextWithFreeText`. `version_conflict` se traduce a `409` y no se resuelve automáticamente.
- `ProblemStep.tsx`: checkbox condicional (solo si hay texto), nunca premarcado, se desmarca si el texto queda vacío; `Continuar` bloqueado solo cuando hay texto sin consentimiento.
- `POST /api/privacy/withdraw-free-text-consent`: mismo guard de pertenencia que las rutas de negocio (por `flowAttemptId`, no por sesión, porque un usuario puede tener intento primario y secundario con free_text independientes).
- `/mis-datos`: botón de retirada por intento, visible solo cuando `hasFreeTextConsent`.

## 5. Pendiente de consulta jurídica externa

- Categorías especiales de terceros introducidas pese a la prohibición (sección 1).
- Si el checkbox único puede servir simultáneamente de consentimiento art. 6.1.a y 9.2.a, o si un regulador exigiría dos acciones distintas.
- Plazo y regla de cómputo definitivos de `free_text_consent_events` (12 meses provisional) y su exclusión o no de `/delete-all`.
