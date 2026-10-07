# VEGA — Paquete para Revisión Jurídica Externa v1

**Estado:** Documento factual preparado para revisión jurídica externa.
**Naturaleza:** Resumen para que un asesor externo pueda responder con rapidez. No contiene conclusiones jurídicas propias ni asume ninguna base jurídica.

---

## 1. Resumen del producto y experimento

Vega es un experimento de validación de producto en fase beta, no un producto comercial en explotación. Ofrece lecturas astrológicas generadas con IA a partir de datos de nacimiento introducidos por el propio usuario.

El experimento compara dos variantes (A/B):
- **Segmento A:** lectura individual, basada únicamente en los datos de nacimiento del propio usuario.
- **Segmento B:** lectura de sinastría (compatibilidad), que requiere además los datos de nacimiento de una segunda persona, introducidos por el usuario.

El objetivo exclusivo de este experimento es validar interés y comportamiento de usuario, no generar ingresos: cualquier intención de pago mostrada en el flujo es una simulación de interfaz (no hay cobro real ni integración con una pasarela de pago).

El tráfico real de usuarios permanece técnicamente suspendido a día de hoy (`EXPERIMENT_ACCEPTING_REAL_TRAFFIC = false`); el sistema solo es accesible mediante tráfico de prueba identificado expresamente como tal.

---

## 2. Segmento B

Resumen fiel de `VEGA_Segmento_B_Revision_Juridica_v1.md`, sin alterar sus hechos:

- El usuario introduce manualmente los datos de nacimiento de una segunda persona; esa persona no accede al producto ni interviene en ningún momento.
- Datos solicitados sobre ella: fecha de nacimiento; hora (solo si el usuario indica que la conoce); lugar de nacimiento (con coordenadas); zona horaria. No se solicitan nombre, email, teléfono, dirección ni ningún identificador de cuenta.
- Supabase almacena temporalmente esos datos en bruto, vinculados solo a un identificador técnico del intento de flujo, nunca a nombre o email.
- El servicio externo de cálculo astrológico (Railway/Vega) recibe fecha, hora, zona horaria y coordenadas de ambas personas, pero ningún identificador interno del experimento.
- OpenAI recibe únicamente categoría del motivo, texto breve opcional, indicadores de precisión, y evidencia astrológica ya calculada y filtrada — nunca fecha, hora, lugar o coordenadas en bruto.
- PostHog no recibe ningún dato de nacimiento de ninguna de las dos personas.
- El dato en bruto de la segunda persona se borra inmediatamente tras el cálculo, con un límite máximo técnico de 1 hora como red de seguridad automática (reducido desde 24 horas el 2026-10-07; hasta ~2 horas reales por la cadencia horaria del cron de limpieza).
- El resultado derivado (solo aspectos astrológicos ya calculados, nunca datos en bruto) tiene una vigencia de 24 horas (reducida desde 30 días el 2026-10-07), exclusivamente para continuidad/reintentos de corto plazo; tras esas 24h no se reutiliza, con independencia de si ya se ha eliminado físicamente, con borrado físico automático en el siguiente ciclo horario dedicado (hasta ~1h de margen adicional).
- No existe ningún mecanismo que registre o verifique la conformidad de la segunda persona con este tratamiento.

**Las 6 preguntas abiertas originales (verbatim, sin mezclar aquí ninguna referencia al art. 22, que no forma parte de ese documento):**
1. ¿Los datos tratados en este diseño deben considerarse datos personales del tercero a efectos del RGPD?
2. Si lo son, ¿qué base jurídica del artículo 6 sería adecuada?
3. ¿Qué obligaciones del artículo 14 se aplicarían y cómo deberían cumplirse?
4. ¿Es suficiente el diseño de minimización actual o recomienda cambios?
5. ¿Debe el usuario realizar alguna declaración antes de aportar estos datos?
6. ¿Es adecuada la retención: borrado inmediato/máximo técnico de 1 hora (hasta ~2 horas reales por la cadencia del cron) para el bruto, y vigencia de 24 horas sin reutilización posterior (hasta ~1 hora adicional hasta la eliminación física) para el derivado (reducidos desde 24 horas y 30 días respectivamente el 2026-10-07)?

---

## 3. Responsable efectivo

La identidad del responsable del tratamiento todavía no está decidida ni identificada. Puede tratarse de una persona física o de una persona jurídica; la estructura societaria futura (si la hay) tampoco está decidida todavía. No se incluye aquí ningún nombre, NIF, domicilio ni email, porque ninguno de esos datos existe todavía — no son un descuido documental, sino una decisión pendiente.

**Pregunta para el asesor:** dado el estado actual (experimento en fase de validación, sin sociedad constituida, sin ingresos reales, tráfico real todavía suspendido), ¿qué estructura y forma de identificación del responsable sería adecuada antes de reabrir tráfico real — puede operar una persona física, o conviene esperar a constituir una sociedad?

---

## 4. Derechos, retenciones y proveedores

**Canal de derechos (implementación técnica ya cerrada):**
- Existe un canal técnico mínimo: resumen de datos propios (`GET /api/privacy/summary`), borrado completo (`POST /api/privacy/delete-all`) y borrado solo de la lista de espera (`POST /api/privacy/delete-waitlist`), accesibles desde `/mis-datos`.
- La identidad técnica actual del usuario se verifica mediante la cookie `vega_session` (firmada, httpOnly) — es el único credential de confianza para resolver qué datos pertenecen a quién.
- `delete-all` elimina: motivo/texto libre, perfil de nacimiento propio, datos y resultado derivado de la segunda persona, lecturas generadas, y la entrada en lista de espera si existe; invalida la sesión actual.
- `delete-all` no elimina la fila técnica de usuario anónimo (`experiment_users`), el registro del intento de flujo (`flow_attempts`) ni la intención de acceso de pago simulado (`priced_access_intents`). Estos tres elementos son registros técnicos/analíticos que se conservan con sus propias finalidades (medición del experimento, integridad del flujo, análisis de conversión) y están sujetos a sus propias políticas de retención, descritas más abajo — no son datos personales en bruto del usuario.
- Las solicitudes de personas sin una sesión viva en el navegador (p. ej. quien perdió sus cookies, o la segunda persona del segmento B) requieren hoy gestión manual; el procedimiento concreto y el criterio de verificación de identidad para ese caso todavía están pendientes de definir.

**Retenciones:**
- Núcleo de datos personales propios: 30 días máximo.
- Datos en bruto de la segunda persona (segmento B): borrado inmediato tras el cálculo, 1 h máximo como red de seguridad (hasta ~2 h reales por la cadencia del cron; reducido desde 24 h el 2026-10-07); resultado derivado: vigencia de 24 h (reducida desde 30 días el 2026-10-07), sin reutilización posterior, exclusivamente para continuidad/reintentos de corto plazo (hasta ~1 h adicional hasta la eliminación física).
- Lista de espera y registro de intención de acceso de pago simulado: 12 meses máximo.
- PostHog (analítica): retención según plan contratado (Free, 12 meses), sin ventana adicional configurada a nivel de proyecto.

**Proveedores y ubicación:**
- Supabase: DPA incorporado automáticamente al aceptar sus condiciones de servicio, sin firma independiente pendiente. Infraestructura en Irlanda (UE).
- OpenAI: DPA ya incorporado a su acuerdo de servicios, sin firma independiente pendiente. Se usa el endpoint global de la API (no el endpoint específico para EEE/Suiza). `store:false` evita la persistencia del application state de la API de Responses; bajo la configuración estándar de OpenAI pueden existir además registros de monitorización de abuso (abuse-monitoring logs) con contenido y metadatos retenidos hasta 30 días, independientemente de `store:false`.
- PostHog: DPA específico todavía pendiente de generar y firmar de forma autoservicio. Infraestructura en la nube europea (EU Cloud).
- Railway: DPA pendiente de ejecución (requiere firma separada). Procesamiento de cálculo en Ámsterdam.
- No se afirma que la totalidad del tratamiento sea exclusivamente europeo; cada proveedor se describe con su ubicación conocida, sin inferir una garantía global.

---

## 5. Preguntas concretas para asesoría

**A. Responsable**
- ¿Quién debería figurar como responsable del tratamiento en la situación actual?
- ¿Conviene esperar a constituir una sociedad, o puede operar válidamente una persona física mientras tanto?
- ¿Qué datos de identificación/contacto deben publicarse como mínimo antes de tráfico real?

**B. Segmento B**
(las 6 preguntas ya aprobadas, listadas en el bloque 2)

**C. Derechos**
- ¿Es razonable `vega_session` como mecanismo de verificación de identidad para estas solicitudes?
- ¿Es `/api/privacy/summary` suficiente como mecanismo de ejercicio del derecho de acceso, o se necesita algo adicional?
- ¿Cómo deberían gestionarse las solicitudes de quien no tiene una sesión viva?
- ¿Cómo puede la segunda persona del segmento B ejercer sus derechos, si no tiene acceso directo al sistema?

**D. Proveedores/transferencias**
- ¿Es suficiente el estado contractual actual (DPA de Supabase y OpenAI ya incorporados; PostHog y Railway pendientes de firma) antes de abrir tráfico real, o hay que ejecutar algo adicional primero?
- ¿El uso del endpoint global de OpenAI (en lugar del específico para EEE/Suiza), junto con los abuse-monitoring logs descritos arriba, requiere alguna medida adicional?

**E. Otros**
- ¿Considera necesaria una DPIA (evaluación de impacto) u otra evaluación formal antes de abrir tráfico real?
- ¿Identifica algún riesgo legal relevante no cubierto por las preguntas anteriores?

---

## Decisiones que NO pedimos al asesor

Los siguientes puntos están técnicamente implementados y no requieren trabajo de ingeniería adicional; no obstante, su adecuación jurídica puede revisarse si el asesor detecta algún problema, y en particular la retención del segmento B sigue formando parte, de forma explícita, de las 6 preguntas abiertas del bloque 2 (pregunta 6):

- Política de retención (plazos de 30 días / 1 h-24 h / 12 meses descritos arriba) — implementada técnicamente; su adecuación jurídica queda abierta, especialmente para el segmento B.
- Arquitectura de minimización de datos (qué recibe cada proveedor).
- El gate técnico que mantiene el tráfico real suspendido.
- El gate `identify()` → `capture()` de PostHog (corrección de una condición de carrera en el envío de eventos de analítica).
- El canal técnico de borrado de datos descrito en el bloque 4.
- La discrepancia histórica de registros con `is_test=false`, ya investigada y cerrada como registros de desarrollo/pruebas locales anteriores al uso sistemático del flag actual.
