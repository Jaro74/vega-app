# VEGA — Consentimiento específico del texto libre (free_text)

Estado: implementado (código) sobre la migración `supabase/migrations/20260110000000_free_text_consent.sql`, verificada manualmente en Supabase (v1 presente, tablas/FKs/RPCs/permisos correctos, smoke test pasado, cron `purge-free-text-consent-events-expired` activo). Tráfico real sigue suspendido (`EXPERIMENT_ACCEPTING_REAL_TRAFFIC = false`).

Migración incremental `supabase/migrations/20260111000000_free_text_consent_v2.sql` (2026-10-10): da de alta `v2` en `free_text_consent_versions` con el aviso/checkbox vigentes (sección 2). **Pendiente de aplicar en Supabase** — `FREE_TEXT_CONSENT_VERSION` ya vale `"v2"` en el código (`libs/experiment/constants.ts`), así que esta migración debe aplicarse antes de abrir tráfico real; aplicarla tarde no rompe nada retroactivamente (v1 sigue intacta), pero cualquier grant nuevo contra una base sin `v2` sembrada fallaría por la FK de `free_text_consent_events.consent_version`.

Ver también el principio de producto no negociable sobre contenido libre en `VEGA_Fase_4C_Especificacion_Final_Experimento.md`, sección 0.

## 1. Problema jurídico

`problem_context.free_text` (Segmento A y B) es un campo opcional de texto libre. A diferencia de `user_birth_profile`/`trigger` (interés legítimo, art. 6.1.f — ver sección 4 de `VEGA_Politica_Privacidad_Beta_v1.md`), el free_text puede llegar a contener una categoría especial del art. 9 RGPD, propia del usuario o, pese a la prohibición expresa, de un tercero mencionado en el texto. El art. 6.1.f nunca elimina la prohibición del art. 9.1: si existe tratamiento de una categoría especial, hace falta además una excepción aplicable del art. 9.2.

Conclusión de diseño (Opción D, cerrada tras varias rondas de revisión):

- `user_birth_profile` → 6.1.f.
- `trigger` → 6.1.f.
- `free_text` → 6.1.a (ordinario) y, cuando el usuario incluye una categoría especial **propia**, 9.2.a (explícito).
- `previews` → hereda la base del free_text si lo usó (`used_free_text`); en caso contrario, solo interés legítimo.
- Categorías especiales de **terceros** introducidas pese a la prohibición: Vega no dispone actualmente de una excepción del art. 9.2 que pueda invocar de forma general, predecible y adecuada para ese supuesto. **Decisión de producto (2026-10-10): Vega ya no intenta clasificar ni bloquear contenido por categoría especial o por referencia relacional** — bloquear por tema penalizaba el contexto humano normal que el experimento necesita (p. ej. "mi hijo es homosexual", "mi pareja tiene depresión", "mi madre está enferma", "mi ex tiene creencias religiosas distintas de las mías" deben poder escribirse sin fricción). El filtro técnico se limita ahora a identificadores directos fuertes (sección 2/4) y no mitiga en absoluto este supuesto. El caso excepcional en que el free_text contenga una categoría especial relativa a un tercero que resulte identificable para Vega queda como **riesgo jurídico abierto, sin ninguna mitigación técnica de contenido**, pendiente de consulta jurídica externa antes de abrir tráfico real (sección 5).

## 2. Texto UX exacto (versión vigente: `v2`)

**Explicativo previo** (antes del textarea) — reformulado hacia minimización, no hacia prohibición de temas (2026-10-10):
> Este campo es opcional. Cuéntanos solo lo necesario para entender tu situación. Evita incluir datos de contacto, documentos de identidad, direcciones u otros datos que permitan identificar directamente a otras personas.

**Checkbox** (no premarcado, separado de cualquier otro consentimiento) — revisado para no sugerir que el usuario autoriza jurídicamente datos sensibles de terceros; simplificado por UX el 2026-10-10 (segunda ronda), separando la mención de retirada del propio texto del consentimiento:
> Doy mi consentimiento para que Vega trate el texto que he escrito para generar mi interpretación personalizada, incluida cualquier información sensible sobre mí que decida compartir. Este consentimiento no se extiende a información sensible sobre otras personas.

**Texto informativo bajo el checkbox** (no forma parte del consentimiento, solo recuerda dónde ejercer la retirada):
> Puedes retirar este consentimiento en cualquier momento desde 'Mis datos'.

Mensaje de error si falta consentimiento: *"Para guardar este texto necesitamos tu consentimiento explícito — marca la casilla de arriba, o borra el texto si prefieres continuar sin él."*

Mensaje si el filtro bloquea el texto: *"Parece que este texto incluye un dato de contacto o un documento de identidad. Elimínalo antes de continuar — Vega no necesita ese tipo de información."*

Texto de retirada (en `/mis-datos`): *"Puedes retirar este consentimiento cuando quieras. Al hacerlo, borraremos el texto que escribiste y cualquier interpretación que lo haya utilizado — el resto de tus datos no se verá afectado."*

**Resuelto mediante versionado (2026-10-10), pendiente solo de aplicar en Supabase:** `free_text_consent_versions.v1` seguía sembrada con el aviso/checkbox **anteriores** (categorías especiales enumeradas), mientras que el código ya mostraba el texto nuevo — una discrepancia real entre la prueba de consentimiento (lo que el catálogo dice que se mostró) y lo que de hecho se mostró. Se resuelve dando de alta `v2` como fila nueva (`supabase/migrations/20260111000000_free_text_consent_v2.sql`), sin modificar ni reinterpretar `v1`: los eventos `granted` ya registrados bajo `v1` siguen siendo una prueba válida del texto que realmente se mostró en su momento; los grants nuevos a partir de este cambio se registran como `v2` (`FREE_TEXT_CONSENT_VERSION` en `libs/experiment/constants.ts`). Falta aplicar esa migración en Supabase antes de abrir tráfico real (ver nota al inicio del documento).

## 3. Modelo técnico

- `free_text_consent_versions`: catálogo del texto exacto por versión (`notice_text`, `checkbox_text`, `content_hash` opcional como control de integridad, no como garantía de inmutabilidad).
- `free_text_consent_events`: historial append-only (`seq` monotónico, `action` en `granted|withdrawn|expired`, `consent_version`). El estado vigente es siempre el último evento por `seq` — nunca una reconstrucción separada de "último granted" + "¿hay un withdrawn después?".
- `previews.used_free_text`: fijado en el momento de generación (nunca recalculado), necesario para saber qué previews borrar al retirar el consentimiento.
- `submit_problem_context_with_free_text()` / `withdraw_free_text_consent()`: RPCs `security definer`, atómicas, bloqueando siempre `flow_attempts` (lock canónico que existe incluso antes de que haya fila en `problem_context`) — serializan grant/retirada/expiración automática del mismo intento.
- `purge_expired_experiment_personal_data()`: inserta `expired` antes de borrar una fila de `problem_context` cuyo último evento siga siendo `granted`, bajo el mismo lock.
- `purge_expired_free_text_consent_events()`: purga ciclos ya cerrados (granted + su withdrawn/expired) 12 meses después del evento terminal — política provisional, no excluye por defecto esta tabla de `/delete-all`; una excepción del art. 17.3.e solo se aplicaría caso por caso, con un indicio concreto de reclamación, nunca de forma preventiva y general.

## 4. Capa de aplicación

- `libs/experiment/direct-identifier-filter.ts` (renombrado desde `third-party-sensitive-text-filter.ts` el 2026-10-10): módulo puro, único, compartido por cliente y servidor. Ya no clasifica contenido por categoría especial ni por marcador relacional — bloquea únicamente cuando detecta un patrón de identificador directo fuerte (email, teléfono, DNI, NIE), sin necesitar ningún contexto adicional. No implementa detección de dirección postal completa ni de pasaporte: ninguno de los dos tiene un patrón suficientemente fiable en español para evitar falsos positivos/negativos relevantes.
- `submitProblem` (`libs/experiment/onboarding-service.ts`): sin texto → upsert simple (sin cambios). Con texto → exige consentimiento, aplica el filtro, delega en `submitProblemContextWithFreeText`. `version_conflict` se traduce a `409` y no se resuelve automáticamente.
- `ProblemStep.tsx`: checkbox condicional (solo si hay texto), nunca premarcado, se desmarca si el texto queda vacío; `Continuar` bloqueado solo cuando hay texto sin consentimiento.
- `POST /api/privacy/withdraw-free-text-consent`: mismo guard de pertenencia que las rutas de negocio (por `flowAttemptId`, no por sesión, porque un usuario puede tener intento primario y secundario con free_text independientes).
- `/mis-datos`: botón de retirada por intento, visible solo cuando `hasFreeTextConsent`.

## 5. Pendiente de consulta jurídica externa

- **Categorías especiales de un tercero identificable introducidas en el free_text (riesgo abierto, reforzado el 2026-10-10):** desde la decisión de producto de no clasificar/bloquear contenido por categoría especial o marcador relacional, este supuesto queda completamente sin mitigación técnica de contenido — solo el aviso general de minimización (sección 2) y la posibilidad de retirada. Es el punto de mayor prioridad para consulta externa antes de abrir tráfico real.
- Si el checkbox único puede servir simultáneamente de consentimiento art. 6.1.a y 9.2.a, o si un regulador exigiría dos acciones distintas.
- Plazo y regla de cómputo definitivos de `free_text_consent_events` (12 meses provisional) y su exclusión o no de `/delete-all`.
- Aplicar en Supabase la migración `20260111000000_free_text_consent_v2.sql` (sección 2) antes de abrir tráfico real — pendiente de ejecución, no de diseño.
