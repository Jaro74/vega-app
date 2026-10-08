# VEGA — Responsable del tratamiento: la sociedad desde el inicio del tráfico real v1

**Naturaleza:** Análisis preparatorio, no vinculante, basado en fuentes oficiales (RGPD/EUR-Lex, AEPD, Agencia Tributaria). Distingue expresamente cuatro planos: **(i) protección de datos**, **(ii) fiscalidad**, **(iii) Seguridad Social/RETA**, **(iv) estructura societaria**.

**Hecho decisivo que encuadra este análisis:** la sociedad se va a constituir de todos modos, como vehículo de varias líneas/proyectos, de los cuales Vega es uno. No se abrirá tráfico real de Vega antes de que esa estructura esté resuelta. Por tanto, el escenario objetivo no es "qué responsable provisional elegimos mientras no hay sociedad", sino: **la sociedad será el responsable del tratamiento de Vega desde el momento en que se abra tráfico real, siempre que sea efectivamente quien determine los fines y medios esenciales de ese tratamiento.** La fase actual (sin sociedad, sin tráfico real) se trata únicamente como situación histórica previa.

---

## 1. Qué condiciones deben cumplirse para que la sociedad sea realmente el responsable del tratamiento

**[NORMA/CRITERIO OFICIAL]** Art. 4.7 RGPD: responsable es quien "determine los fines y medios del tratamiento" — es una posición **fáctica**, no una etiqueta que se declara en un documento. Si la entidad que realmente decide para qué y cómo se tratan los datos de Vega no coincide con la entidad nombrada "responsable" en la política pública, existe una discordancia entre la designación formal y la realidad operativa, que el RGPD no resuelve a favor de lo declarado sino de lo efectivamente decidido.

**[INTERPRETACIÓN]** Para que la sociedad sea realmente, y no solo nominalmente, el responsable del tratamiento de Vega, deben concurrir:

1. **Decisión operativa de Vega (no un requisito que derive directamente del art. 4.7 RGPD):** Vega no abrirá tráfico real hasta que la sociedad esté constituida y disponga de sus datos identificativos definitivos, incluido su NIF definitivo. El art. 4.7 RGPD no exige, por sí mismo, que el responsable disponga de un NIF definitivo para poder serlo — una sociedad en constitución, o incluso una persona física, podría en teoría ser responsable sin ese requisito formal. Esta es una decisión conservadora propia del proyecto, no una exigencia normativa, adoptada para evitar tener que repetir después los pasos de alineación contractual y documental.
2. **Que las decisiones sobre fines y medios del tratamiento de Vega se tomen en nombre de la sociedad**, no a título personal de ninguno de los promotores — esto incluye quién aprueba cambios en qué datos se recogen, para qué se usan, cuánto se conservan, etc.
3. **Que las relaciones contractuales con los proveedores que procesan datos de Vega (Supabase, OpenAI, PostHog, Railway) identifiquen a la sociedad como cliente/responsable** — ver distinción importante en el punto siguiente.
4. **Que la identidad publicada en la política de privacidad y el TOS coincida exactamente con la sociedad constituida** (razón social, NIF, domicilio social, contacto).
5. **Que exista un canal de contacto de privacidad operativo** vinculado a la sociedad (bloque 6).
6. **Que la documentación interna (bloque 7) refleje esta estructura real**, no una genérica a actualizar más adelante.

**[INTERPRETACIÓN — distinción entre responsable fáctico y titularidad contractual]** Debe mantenerse la siguiente distinción, sin mezclarla:

- **El responsable del tratamiento a efectos del RGPD se determina fácticamente por quién decide los fines y medios esenciales del tratamiento** (art. 4.7 RGPD) — no por el nombre que figure en la cuenta de un proveedor.
- **Los contratos y DPA (art. 28 RGPD, para los encargados del tratamiento)** deben estar correctamente alineados con la sociedad que actúa como responsable, de modo que el proveedor reconozca a la sociedad como su cliente y como responsable a efectos de ese contrato.
- **Que una cuenta o contrato siga a nombre de una persona física mientras la sociedad ya existe y ya decide de hecho los fines y medios genera una incoherencia contractual y de rendición de cuentas (accountability)** que debe resolverse antes de tráfico real — pero **esa incoherencia no determina, por sí sola, quién es el responsable RGPD**: si la sociedad es quien realmente decide los fines y medios, es responsable con independencia de que el papeleo del proveedor no lo refleje todavía correctamente. El problema de la cuenta a nombre de una persona física es un problema de alineación contractual y de evidencia documental (accountability, art. 5.2 y art. 24 RGPD), no una cuestión que redefina quién ostenta la posición de responsable.

Si alguna de estas condiciones no se cumple en el momento de abrir tráfico real, la sociedad no sería realmente el responsable del tratamiento con independencia de lo que se publique — sería una designación formal sin respaldo fáctico suficiente.

---

## 2. Qué datos de la sociedad deben aparecer en privacidad/TOS

**[NORMA/CRITERIO OFICIAL]** Art. 13.1.a / 14.1.a RGPD: identidad y datos de contacto del responsable.

**[INTERPRETACIÓN]** Antes de abrir tráfico real, la política pública y el TOS deben contener, de la sociedad ya constituida:

- Razón social completa.
- **NIF** (nunca CIF — la identificación fiscal de personas jurídicas en España es, desde la Ley 36/2006 y la normativa posterior, el NIF).
- Domicilio social.
- Email de contacto específico para asuntos de privacidad (bloque 6) — distinto, si se quiere, de un email de contacto comercial general.
- Si existe DPD designado (no es obligatorio para un proyecto de este tamaño salvo que se active alguno de los supuestos del art. 37 RGPD, cuestión no analizada aquí por no haberse planteado como hecho relevante), sus datos de contacto.

No se publica "responsable pendiente de constitución" en la versión definitiva — eso solo es aceptable en documentación interna de trabajo, nunca en la política pública que rige cuando se abra tráfico real.

---

## 3. Qué relaciones contractuales con proveedores deben quedar alineadas con la sociedad

**[INTERPRETACIÓN]**

Antes de tráfico real debe verificarse que la relación contractual y el DPA aplicables identifican correctamente a la sociedad como cliente/responsable, mediante cambio de titularidad de cuenta, actualización contractual, o cualquier otro mecanismo que cada proveedor ofrezca para ese fin — **sin presuponer que necesariamente haya que crear una cuenta nueva** en ninguno de los cuatro casos; puede bastar con actualizar los datos de facturación/titular existentes si el proveedor lo permite.

- **Supabase, OpenAI, PostHog, Railway:** para cada uno debe comprobarse qué mecanismo concreto ofrece (cambio de titular de cuenta, actualización de datos de facturación, nueva cuenta si no hay alternativa) y aplicarlo — esto es una decisión operativa por proveedor, no jurídica, y no se resuelve en este documento.
- Debe documentarse (aunque sea internamente) qué cuenta de cada proveedor es la "oficial" de la sociedad, con quién gestiona el acceso (credenciales, facturación) — relevante también para la continuidad operativa, no solo para protección de datos.

---

## 4. Qué DPAs deben completarse/firmarse a nombre de la sociedad

**[HECHO, de la documentación ya verificada en este proyecto]**

- **Supabase:** DPA se incorpora automáticamente al aceptar sus condiciones de servicio — debe verificarse y, si corresponde, actualizarse la relación contractual (titularidad de cuenta, datos de facturación, o el mecanismo que ofrezca el proveedor) para que identifique correctamente a la sociedad como cliente/responsable — sin presuponer que haga falta crear una cuenta nueva.
- **OpenAI:** DPA ya incorporado a su acuerdo de servicios — misma verificación y, si corresponde, actualización.
- **PostHog:** DPA específico pendiente de generar y firmar de forma autoservicio — debe firmarse ya directamente a nombre de la sociedad, no antes bajo una identidad provisional que luego haya que repetir.
- **Railway:** DPA pendiente de ejecución mediante firma separada (DocuSign) — debe firmarse a nombre de la sociedad, con la persona con poder de representación suficiente como firmante.

**[INTERPRETACIÓN]** No tiene sentido firmar o generar ninguno de los DPAs pendientes (PostHog, Railway) antes de que la sociedad exista y la relación contractual esté alineada con ella — hacerlo antes solo generaría la necesidad de repetir el trámite. El orden lógico es: constituir sociedad → alinear relaciones contractuales con proveedores → firmar los DPAs pendientes ya a nombre de la sociedad.

---

## 5. Qué cambia en Supabase, OpenAI, PostHog y Railway

**[INTERPRETACIÓN]**

- **Supabase:** verificación y, si corresponde, actualización de la relación contractual (titularidad de cuenta, datos de facturación, o el mecanismo que ofrezca el proveedor) para que identifique correctamente a la sociedad como cliente/responsable — sin presuponer que haga falta crear una cuenta nueva; verificar que el DPA incorporado corresponde a esa relación ya alineada.
- **OpenAI:** misma verificación y actualización; verificar que el acuerdo de servicios vigente es el de la relación contractual ya alineada con la sociedad; revisar si conviene en ese momento también evaluar el uso del endpoint específico EEE/Suiza (cuestión ya identificada como mejora disponible en `VEGA_Paquete_Revision_Juridica_Externa_v1.md`, no resuelta aquí).
- **PostHog:** misma verificación y actualización; generación y firma del DPA específico ya a nombre de la sociedad.
- **Railway:** misma verificación y actualización; firma del DPA pendiente a nombre de la sociedad.

En los cuatro casos, la condición previa es que la relación contractual quede correctamente alineada con la sociedad — sin eso, cualquier DPA firmado "a nombre de la sociedad" sería formalmente incoherente con quién es realmente el cliente contractual del proveedor.

---

## 6. Qué email/canal de privacidad debe existir

**[INTERPRETACIÓN]** Antes de abrir tráfico real debe existir un canal de contacto de privacidad:

- Con un email identificable como tal (p. ej. `privacidad@` o `privacy@` del dominio de la sociedad), no un email personal de ninguno de los promotores.
- Operativo de verdad — alguien debe revisarlo con una cadencia razonable, no ser una dirección que se publica pero no se monitoriza.
- Vinculado a los procedimientos ya diseñados en `VEGA_Analisis_Art14_Segmento_B_v1.md` (canal para la segunda persona del segmento B) y al canal técnico ya implementado (`/mis-datos`, `/api/privacy/*`) para quienes sí tienen sesión viva — este email es, específicamente, el canal para quienes no la tienen, o para cualquier consulta que exceda lo que el canal técnico resuelve.

---

## 7. Qué documentación interna debe actualizarse

**[INTERPRETACIÓN]** Una vez constituida la sociedad y completados los puntos 1-6, deben actualizarse (no se hace en este documento, solo se enumera qué quedaría pendiente):

- `VEGA_Politica_Privacidad_Beta_v1.md` — sección 1 (responsable), sección 7 (proveedores, con el estado real de los 4 DPAs ya alineados con la sociedad), sección 8 (canal de derechos, con el email real).
- `VEGA_Plan_Tecnico_Implementacion_Experimento.md` — sección 83 (canal de derechos) y la sección de PostHog, sustituyendo cualquier referencia a "responsable no decidido" por los datos reales.
- `VEGA_Paquete_Revision_Juridica_Externa_v1.md`, `VEGA_LIA_Segmento_B_v1.md` y `VEGA_Analisis_Art14_Segmento_B_v1.md` — estos tres documentos asumían como hecho la ausencia de responsable decidido; una vez resuelta, deberían revisarse para reflejar el cambio, en particular el LIA (bloque 4 de su ponderación) y el análisis de art. 14 (bloque 6, que marcaba la identidad del responsable como bloqueante de la versión pública definitiva).
- La propia política pública (`app/privacy-policy/page.tsx`), el TOS (`app/tos/page.tsx`) y la página pública para terceros (`app/datos-de-terceros/page.tsx`, implementada el 2026-10-08), sustituyendo los placeholders/mensajes de "canal todavía no operativo" actuales por los datos reales de la sociedad y el email de privacidad real — esto no se hace en este documento (es código/contenido público, fuera del alcance de este análisis).

---

## 8. Qué debe ocurrir antes de poner `EXPERIMENT_ACCEPTING_REAL_TRAFFIC = true`

**[INTERPRETACIÓN]** Como mínimo, y en este orden lógico:

1. Sociedad constituida, con datos identificativos definitivos, incluido el NIF definitivo (decisión operativa de Vega, no requisito directo del art. 4.7 RGPD).
2. Relaciones contractuales de Supabase, OpenAI, PostHog y Railway alineadas con la sociedad (o formalmente actualizadas).
3. DPAs de PostHog y Railway firmados a nombre de la sociedad; verificación de que los DPAs de Supabase y OpenAI, ya incorporados contractualmente, corresponden a esa relación ya alineada.
4. Email/canal de privacidad de la sociedad operativo.
5. Política pública y TOS actualizados con los datos reales de la sociedad (bloque 2).
6. Documentación interna actualizada (bloque 7).
7. **Cerrar y documentar internamente, con fuentes oficiales, las cuestiones jurídicas todavía abiertas del segmento B** (si los datos del tercero son datos personales a efectos del RGPD; el LIA; el art. 14; las expectativas razonables; las salvaguardas) — este análisis de responsable no sustituye ese trabajo, que sigue siendo necesario con independencia de quién sea el responsable formal. **Si, tras ese análisis interno, queda una incertidumbre jurídica material que no pueda resolverse con suficiente seguridad usando fuentes oficiales, se valorará entonces una consulta externa puntual antes de abrir tráfico real** — no se asume de entrada que esa consulta sea obligatoria.

**Separación explícita, conforme a lo solicitado:**
- **RGPD/responsable del tratamiento:** resuelto por los puntos 1-6 anteriores.
- **Fiscalidad:** la constitución de la sociedad implica, en todo caso, alta censal de la propia sociedad mediante el **modelo 036** (el modelo 037 fue eliminado por la Orden HAC/1526/2024, BOE de 9 de enero de 2025, con efectos desde el 3 de febrero de 2025 — desde esa fecha todas las altas, modificaciones y bajas censales se tramitan exclusivamente con el modelo 036, sin excepciones) — esto es un trámite propio de la constitución societaria, no específico de Vega.
- **Seguridad Social/RETA:** **no se analiza en este documento** quién de los promotores deberá darse de alta como autónomo, ni el régimen de encuadramiento de administradores o socios trabajadores de la sociedad — queda constancia expresa de que es una cuestión distinta, que deberá resolverse en el momento de constituir la sociedad y definir los roles de cada promotor en ella (socio, administrador, empleado, o combinación), conforme al art. 305 LGSS y a la normativa específica de encuadramiento de administradores societarios.
- **Estructura societaria:** la decisión de que Vega sea una línea/proyecto dentro de una sociedad más amplia (no una sociedad dedicada en exclusiva a Vega) no cambia nada de lo anterior desde el punto de vista RGPD — la sociedad, cualquiera que sea su objeto social amplio, puede igualmente ser responsable del tratamiento de los datos de cualquiera de sus líneas de negocio, incluida Vega.

---

# Checklist exacta de transición — sociedad como responsable antes de tráfico real

| # | Acción | Plano | Depende de |
|---|---|---|---|
| 1 | Constituir la sociedad y obtener sus datos identificativos definitivos, incluido el NIF definitivo (decisión operativa de Vega, no requisito directo del art. 4.7 RGPD) | Societario / decisión operativa | — |
| 2 | Alta censal de la sociedad mediante modelo 036 | Fiscal | 1 |
| 3 | Definir roles de los promotores en la sociedad (socio/administrador/empleado) — sin resolver aquí el régimen de RETA/encuadramiento asociado | Societario / SS (pendiente, fuera de alcance de este documento) | 1 |
| 4 | Verificar/actualizar la relación contractual de Supabase para que identifique a la sociedad como cliente (titularidad, facturación, u otro mecanismo del proveedor) | RGPD / operativo | 1 |
| 5 | Verificar/actualizar la relación contractual de OpenAI para que identifique a la sociedad como cliente | RGPD / operativo | 1 |
| 6 | Verificar/actualizar la relación contractual de PostHog para que identifique a la sociedad como cliente | RGPD / operativo | 1 |
| 7 | Verificar/actualizar la relación contractual de Railway para que identifique a la sociedad como cliente | RGPD / operativo | 1 |
| 8 | Verificar que el DPA de Supabase corresponde a la relación contractual ya alineada con la sociedad | RGPD | 4 |
| 9 | Verificar que el DPA de OpenAI corresponde a la relación contractual ya alineada con la sociedad | RGPD | 5 |
| 10 | Generar y firmar el DPA de PostHog a nombre de la sociedad | RGPD | 6 |
| 11 | Firmar el DPA de Railway (DocuSign) a nombre de la sociedad | RGPD | 7 |
| 12 | Crear el email/canal de privacidad de la sociedad y asignar quién lo monitoriza | RGPD | 1 |
| 13 | Actualizar `app/privacy-policy/page.tsx` con los datos reales de la sociedad (incluido NIF, nunca CIF) | RGPD / público | 1, 12 |
| 14 | Actualizar `app/tos/page.tsx` con los datos reales de la sociedad | RGPD / público | 1 |
| 14bis | Actualizar `app/datos-de-terceros/page.tsx` con el canal de privacidad real, cerrando operativamente la medida sustitutiva del art. 14.5.b | RGPD / público | 1, 12 |
| 15 | Actualizar `VEGA_Politica_Privacidad_Beta_v1.md` (secciones 1, 7, 8) | Documentación interna | 8-12 |
| 16 | Actualizar `VEGA_Plan_Tecnico_Implementacion_Experimento.md` (sección 83 y PostHog) | Documentación interna | 8-12 |
| 17 | Revisar `VEGA_LIA_Segmento_B_v1.md` a la luz de la identidad ya resuelta | Documentación interna | 1 |
| 18 | Revisar `VEGA_Analisis_Art14_Segmento_B_v1.md` a la luz de la identidad ya resuelta | Documentación interna | 1 |
| 19 | **Revisión jurídica interna final** de las cuestiones abiertas del segmento B (datos personales del tercero, LIA, art. 14, expectativas razonables, salvaguardas), documentada con fuentes oficiales; si queda incertidumbre material no resoluble con suficiente seguridad, valorar entonces una consulta externa puntual | Jurídico (interno, con posible escalado puntual) | En paralelo, no depende de 1-18 |
| 20 | Poner `EXPERIMENT_ACCEPTING_REAL_TRAFFIC = true` | Técnico | 1-19 |

---

No se ha modificado ningún otro archivo.
