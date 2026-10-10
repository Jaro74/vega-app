# VEGA — Política de Privacidad Beta v1

**Estado:** Borrador interno  
**Fase:** Waitlist / beta cerrada  
**Publicación:** No publicar hasta completar los datos de la sociedad responsable y revisar proveedores y transferencias.

---

## 1. Responsable del tratamiento

**Responsable:** [SOCIEDAD VEGA — pendiente de constitución]  
**NIF:** [pendiente]  
**Domicilio:** [pendiente]  
**Email de privacidad:** [pendiente]

Esta información deberá completarse antes de recoger datos de usuarios reales.

---

## 2. Qué datos recogemos en esta fase

Durante esta fase, Vega puede tratar dos bloques de datos distintos.

**Datos del flujo de exploración (router, onboarding y preview):**

- el motivo o situación que quieres explorar (una categoría cerrada y, opcionalmente, un texto breve que escribas sobre tu situación);
- tu fecha de nacimiento, y tu hora de nacimiento solo si indicas que la conoces;
- tu lugar de nacimiento (como lugar y coordenadas asociadas, no como una dirección);
- cuando el flujo lo requiere, esos mismos datos de nacimiento de una segunda persona, aportados por ti;
- la evidencia astrológica derivada y el resultado (preview) que se genera a partir de esos datos;
- identificadores técnicos del propio flujo (usuario anónimo, intento de flujo, segmento asignado).

**Datos de la lista de espera (waitlist):**

- dirección de correo electrónico;
- versión del consentimiento aceptado;
- fecha de alta en la lista de espera;
- estado de la solicitud.

En ambos bloques, además: información técnica y analítica necesaria para medir el funcionamiento de la experiencia (ver sección 6).

La finalidad de esta fase no es crear todavía una cuenta completa de usuario.

---

## 3. Para qué usamos los datos

El email se utilizará únicamente para:

- gestionar la lista de espera;
- avisar cuando el acceso a Vega esté disponible;
- gestionar una posible invitación a la beta.

No utilizaremos el email de la waitlist para newsletters, promociones o publicidad sin una base jurídica o consentimiento independientes.

---

## 4. Base jurídica

El tratamiento del email de la waitlist se basa en el consentimiento prestado expresamente por el usuario.

El usuario puede retirar ese consentimiento en cualquier momento.

### Datos propios del usuario en el flujo de exploración

La fecha/hora/lugar de nacimiento propios y el motivo seleccionado (trigger) se tratan bajo interés legítimo (art. 6.1.f RGPD): son necesarios para generar la interpretación astrológica solicitada, el tratamiento se limita a esa finalidad y no incluyen, por sí mismos, ninguna categoría especial del art. 9 RGPD.

El texto libre opcional (free_text) es distinto: puede llegar a contener una categoría especial del propio usuario (salud, orientación o vida sexual, religión o creencias, origen racial o étnico, afiliación sindical, datos genéticos o biométricos) — Vega no lo solicita ni lo clasifica, pero el usuario puede decidir incluirlo para describir mejor su situación. Por eso se trata bajo consentimiento específico (art. 6.1.a RGPD) y, cuando el usuario decide incluir alguno de esos datos sobre sí mismo, bajo consentimiento explícito (art. 9.2.a RGPD) — nunca bajo interés legítimo, que no puede servir de excepción al art. 9.1. Ver `VEGA_Consentimiento_FreeText_v1.md` para el diseño completo (texto exacto del aviso/checkbox, modelo de retirada, filtro de minimización de identificadores directos).

Ese mismo consentimiento específico **no cubre, en ningún caso, categorías especiales de una persona distinta del usuario** mencionadas en el texto libre: el art. 9.2.a exige el consentimiento explícito de la persona titular de esos datos, no de quien los menciona. Vega no dispone actualmente de una excepción del art. 9.2 que pueda invocar de forma general, predecible y adecuada para ese supuesto. Vega no clasifica ni bloquea el contenido del texto libre por categoría especial ni por referencia relacional (p. ej. menciones a un hijo, una pareja, una madre o un ex): este tipo de contexto humano es precisamente el que el experimento necesita para generar la interpretación. El único filtro técnico aplicado minimiza identificadores directos fuertes que nunca son necesarios para esa finalidad (email, teléfono, DNI, NIE), con independencia de a quién pertenezcan — no detecta ni mitiga, de ninguna forma, la presencia de categorías especiales de terceros. Ese supuesto excepcional queda como riesgo jurídico abierto, pendiente de consulta jurídica externa antes de abrir tráfico real.

Las previews generadas heredan la base del texto libre utilizado para generarlas cuando lo usan (`used_free_text`); en caso contrario, se basan únicamente en los datos propios bajo interés legítimo.

---

## 5. Conservación

### Datos del flujo de exploración (router, onboarding, previews)

Vega aplica una retención automática de **30 días**, calculada siempre desde el momento en que cada dato se creó (no desde el cierre del experimento ni desde ningún otro evento posterior), a:

- el motivo y el texto breve sobre tu situación;
- tu propia fecha/hora de nacimiento;
- el resultado (preview) generado.

Transcurridos esos 30 días, estos datos se eliminan automáticamente mediante un proceso técnico programado, sin intervención manual.

Los datos de una segunda persona (Segmento B) siguen dos reglas distintas y más estrictas:

- el dato de nacimiento en bruto se elimina inmediatamente después de calcular la evidencia astrológica necesaria y, como máximo, a la **hora** desde que se aportó, aunque ese cálculo no llegara a completarse — por la frecuencia horaria de la limpieza técnica periódica que actúa como red de seguridad adicional, el tiempo real máximo hasta esa eliminación, en el caso excepcional de que falle el borrado inmediato, puede aproximarse a **2 horas**;
- la evidencia astrológica ya derivada (sin datos de nacimiento en bruto) tiene una vigencia de **24 horas**, únicamente para poder mostrarte el mismo resultado sin recalcularlo si vuelves a la pantalla en ese plazo corto — no como una ventana general para revisar el resultado más adelante. Transcurridas esas 24 horas, el dato deja de poder reutilizarse, con independencia de si ya se ha eliminado físicamente; su eliminación física ocurre en el siguiente ciclo de la limpieza técnica horaria, por lo que puede existir un margen operativo de hasta aproximadamente 1 hora adicional entre que deja de ser válido y se borra.

Los identificadores técnicos que permiten medir el funcionamiento del experimento (usuario anónimo, intento de flujo, segmento asignado) no siguen esta regla de 30 días: se conservan más tiempo porque son necesarios para las métricas del experimento y porque de ellos depende, indirectamente, la integridad de otros datos con su propio plazo (como la waitlist, más abajo). Estos identificadores son datos técnicos pseudonimizados — no incluyen texto libre, datos de nacimiento ni email —, pero no deben entenderse como datos completamente anónimos o neutros desde el punto de vista de la privacidad.

La intención de pago de prueba (fase de precio, sin cobro real) no está sujeta a esta regla de 30 días: se conserva durante el experimento, con un límite máximo automático de **12 meses** como red de seguridad, y está prevista su eliminación manual al cierre del experimento, una vez guardada la métrica final en otro sitio.

### Datos de la lista de espera (waitlist)

El email se conservará como máximo durante **12 meses desde el alta en la waitlist**.

Podrá eliminarse antes si:

- el usuario retira el consentimiento;
- solicita la supresión;
- deja de existir la finalidad.

Si se envía una invitación de acceso, el email podrá mantenerse durante un máximo de **90 días** para gestionar esa invitación.

Si posteriormente el usuario crea una cuenta o utiliza el servicio completo, sus datos pasarán a regirse por la política de privacidad aplicable a esa nueva fase del producto.

### Datos de analítica (PostHog)

Los eventos de analítica (ver sección 6) se conservan en PostHog, nunca en Supabase, con esta política:

- se conservan durante el experimento y mientras dure su análisis posterior;
- como máximo 12 meses, según el plan de PostHog actualmente en uso;
- al cierre del experimento, y una vez guardadas las métricas finales en otro sitio, está prevista una eliminación manual anticipada de estos eventos.

---

## 6. Analítica

Vega utiliza herramientas de analítica para entender cómo funciona el experimento y mejorar la experiencia.

En esta fase, el email no debe enviarse como propiedad de eventos analíticos.

Los eventos del experimento utilizan identificadores técnicos separados del email.

La herramienta de analítica es PostHog, en su variante europea (**PostHog Cloud EU**). La grabación de sesión (Session Replay) está desactivada por configuración: Vega solo envía los eventos puntuales de su catálogo congelado, nunca una grabación de la navegación. PostHog no recibe en ningún caso el email, la fecha/hora/lugar de nacimiento, el texto libre que el usuario escribe, ni los identificadores técnicos de la evidencia astrológica generada — esto se verifica automáticamente antes de enviar cualquier evento.

El identificador anónimo que Vega guarda en su base de datos (`anonymous_user_id`) es exactamente el mismo identificador que PostHog usa internamente para asociar eventos a un visitante (su `distinct_id`); no existe ningún identificador adicional ni ninguna tabla de correspondencia entre ambos.

Hasta una revisión reciente existía una ventana breve, al cargar la página, en la que algunos eventos podían llegar a PostHog antes de que ese identificador quedara confirmado — quedando asociados a un identificador interno de PostHog distinto del guardado en Supabase. Esto está corregido: ahora ningún evento se envía hasta que el identificador anónimo queda confirmado; si esa confirmación llega a fallar, los eventos de esa visita se descartan en lugar de enviarse sin identificar correctamente.

---

## 7. Proveedores y encargados del tratamiento

Antes de publicar esta política deberán revisarse y documentarse los proveedores que intervienen realmente en la fase beta.

Actualmente deben revisarse, como mínimo:

- Supabase;
- PostHog;
- Railway / infraestructura de Vega;
- OpenAI;
- cualquier proveedor adicional que intervenga en almacenamiento, analítica o generación.

Para cada uno habrá que confirmar:

- finalidad;
- datos tratados;
- ubicación del tratamiento;
- condiciones contractuales;
- posibles transferencias internacionales;
- medidas aplicables.

### Supabase

- Supabase actúa como proveedor de infraestructura y base de datos
  principal del proyecto. La base de datos principal está desplegada en
  **West EU (Ireland), región `eu-west-1`**.
- Supabase dispone de un Acuerdo de Tratamiento de Datos (DPA) propio y
  puede recurrir a subencargados del tratamiento.
- Para posibles transferencias internacionales de datos fuera del Espacio
  Económico Europeo, el marco contractual puede apoyarse en mecanismos
  como las Cláusulas Contractuales Tipo (SCCs), según corresponda en cada
  caso.
- El DPA de Supabase **se incorpora automáticamente al Agreement** al
  aceptar sus Terms of Service — no requiere firma independiente — e
  incorpora las Cláusulas Contractuales Tipo (SCCs) según corresponda.
  Queda pendiente verificar y completar, en la configuración de la
  cuenta, los datos de cliente/responsable del tratamiento (nombre,
  dirección, rol y categorías de datos tratados) una vez esté decidida
  esa identificación.
- Esto no implica que la totalidad de los tratamientos de Supabase
  ocurran exclusivamente dentro de la Unión Europea — algunos
  subencargados o funciones de soporte pueden operar fuera del EEE bajo
  las garantías contractuales aplicables, extremo que deberá confirmarse
  en la revisión contractual definitiva.

### PostHog

- Vega utiliza **PostHog Cloud EU**, con infraestructura europea, para
  analítica de producto.
- El email de la waitlist no se envía como propiedad de ningún evento de
  analítica (ver sección 6).
- **Retención y trazabilidad técnica: cerradas.** Verificado por código
  (no solo por diseño): Session Replay desactivado; ningún dato personal
  en bruto llega a PostHog; el `anonymous_user_id` de Supabase es
  exactamente el `distinct_id` de PostHog, sin mapping adicional; la
  antigua condición de carrera entre `identify()` y el envío de eventos
  está corregida; y la política de retención de los eventos (durante el
  experimento y su análisis, máximo 12 meses según el plan, con purga
  manual anticipada prevista al cierre) ya está definida (ver sección 5,
  "Datos de analítica (PostHog)", y sección 6 de este documento, y
  `VEGA_Plan_Tecnico_Implementacion_Experimento.md`, sección "PostHog —
  Estado real (verificado)").
- **DPA específico de PostHog: pendiente operativo hasta definir al
  responsable efectivo.** PostHog dispone de un DPA propio y puede
  recurrir a subencargados del tratamiento, y contempla mecanismos como
  el **EU-US Data Privacy Framework** y/o **Cláusulas Contractuales
  Tipo (SCCs)** para transferencias internacionales, según corresponda.
  Pero ese DPA **no queda formalizado solo por existir la versión
  pública**: requiere generarlo y firmarlo específicamente para la
  organización de Vega desde `app.posthog.com/legal`. Esto sigue
  pendiente, como gestión operativa antes de tráfico real, hasta que la
  identidad del responsable del tratamiento quede decidida — no debe
  ejecutarse todavía con una identidad provisional. Este pendiente es
  puramente contractual: no afecta a lo ya cerrado en el punto anterior.
- Esto no implica que absolutamente todo el procesamiento de PostHog se
  limite físicamente a la Unión Europea — determinadas funciones de
  soporte o subencargados pueden operar fuera del EEE bajo las garantías
  contractuales aplicables, extremo que deberá confirmarse en la revisión
  contractual definitiva.

### OpenAI — detalle técnico ya verificado

A fecha de esta revisión, el tratamiento técnico de datos hacia OpenAI para la
generación de previews es el siguiente:

- Vega utiliza la Responses API de OpenAI con Structured Outputs (salida
  forzada a un esquema JSON fijo).
- Las llamadas se realizan con `store: false`: OpenAI no retiene la
  respuesta para recuperación posterior vía API.
- No se utilizan la Conversations API, Files, vector stores ni
  `previous_response_id` — cada llamada es independiente, sin encadenar
  estado entre peticiones.
- No se envían a OpenAI: el email de la waitlist, el `anonymousUserId`, el
  `flowAttemptId`, ni la fecha, hora o lugar de nacimiento, ni coordenadas.
- Sí se envían: la categoría del problema (`trigger`), el texto libre que
  el usuario escribe sobre su situación, los indicadores de
  precisión/conocimiento de hora, y la evidencia astrológica ya calculada
  por Vega/Railway (sin datos de nacimiento en bruto).
- Esta configuración reduce la persistencia de OpenAI sobre estas llamadas
  concretas, pero no sustituye la revisión contractual pendiente: el
  tratamiento técnico que OpenAI pueda realizar fuera de esa persistencia
  desactivada (procesamiento de la petición, medidas de abuso/seguridad,
  obligaciones legales, etc.) sigue sujeto a sus condiciones y políticas
  aplicables, que deben revisarse igualmente antes de publicar esta
  política.

### OpenAI — contratación y transferencias internacionales

- OpenAI ofrece un Data Processing Addendum (DPA) **ya incorporado a su
  Services Agreement** — no está pendiente de firma —, que cubre GDPR y
  contempla a los clientes del EEE bajo OpenAI Ireland Ltd. como
  contraparte. Queda pendiente, con la identidad del responsable del
  tratamiento ya decidida, documentar la gestión de la cuenta comercial
  frente a OpenAI y el mecanismo de transferencia aplicado mientras se
  use el endpoint global (ver más abajo).
- Para transferencias de datos desde el EEE/Suiza fuera de esas regiones,
  el DPA de OpenAI prevé que OpenAI Ireland utilice Cláusulas
  Contractuales Tipo (SCCs) o una decisión de adecuación aplicable, según
  corresponda.
- OpenAI publica y mantiene actualizada una lista de subencargados
  (subprocessors) en su sitio oficial; dicha lista puede cambiar sin que
  este documento se actualice en tiempo real — debe consultarse la fuente
  oficial de OpenAI para el estado vigente.
- OpenAI ofrece una región de tratamiento específica para Europa (EEA +
  Suiza) para clientes de API, configurable por proyecto. Acceder a esa
  residencia europea requiere, según la documentación vigente de OpenAI,
  cumplir requisitos adicionales de elegibilidad/configuración, incluidos
  controles de monitorización de abuso aprobados y la ejecución del
  correspondiente Modified Retention amendment. **Vega no tiene activada
  esta configuración hoy**: las llamadas actuales usan el endpoint global
  por defecto de la API (Responses API), no el endpoint europeo — queda
  identificado como una mejora pendiente, no como una garantía ya
  cumplida.
- OpenAI declara que los datos enviados vía API no se usan para entrenar
  sus modelos por defecto, y mantiene logs de monitorización de
  abuso/seguridad durante un plazo estándar (hasta 30 días) bajo
  configuración estándar, independientemente de que nuestras llamadas
  usen `store: false` — ese parámetro limita la persistencia de la
  respuesta para recuperación posterior, pero no excluye por sí solo esos
  logs de seguridad.
- Existen opciones contractuales adicionales de OpenAI, como Zero Data
  Retention (ZDR) o Modified Abuse Monitoring (MAM), sujetas a aprobación
  previa de OpenAI (no autoservicio) y a un caso de uso elegible. **Vega
  no las ha solicitado ni tiene ninguna de ellas aprobada hoy.**
- Recordatorio de alcance (ya documentado en la subsección anterior):
  Vega no envía a OpenAI el email de la waitlist, el `anonymousUserId`,
  el `flowAttemptId`, ni fecha/hora/lugar de nacimiento en bruto.

### Railway / Vega API — detalle técnico ya verificado

Vega utiliza una API propia desplegada en Railway ("vega-api") para
calcular la evidencia astrológica. Verificado a fecha de esta revisión:

- La región actual del servicio `vega-api` y de su volumen asociado es
  **EU West (Amsterdam, Países Bajos)**, tras una migración desde US West.
- **Segmento A:** se usa `POST /evidence/natal`.
- **Segmento B:** se usa `POST /evidence/synastry`.
- `vega-api` procesa, para calcular esa evidencia: fecha de nacimiento,
  hora (solo si es conocida), zona horaria y coordenadas
  (latitud/longitud).
- `vega-api` **no** recibe: el email de la waitlist, el
  `anonymousUserId`, el `flowAttemptId`, ni el nombre de la ciudad — solo
  recibe un `request_id` efímero generado por cada llamada, sin relación
  directa con la identidad del experimento.
- Las respuestas de `vega-api` devuelven evidencia ya derivada e
  identificadores técnicos de carta (`chart_id`) y de contexto de
  precisión/hora conocida, pero **no** devuelven de nuevo la fecha, hora o
  lugar en bruto enviados.
- Tras la migración a Amsterdam, se validaron `POST /evidence/natal` y
  `POST /evidence/synastry` con datos sintéticos (nunca datos de usuarios
  reales): ambas llamadas devolvieron `200` y la respuesta superó los
  validadores reales de la aplicación (`validateVegaNatalPayload` /
  `validateVegaSynastryPayload`).

Adicionalmente, el equipo operador confirmó directamente en el entorno de
Railway (fuera del alcance de esta revisión de código, que no tiene
acceso al dashboard ni al sistema de archivos del servicio):

- el volumen `/app/runtime` sigue montado y conserva, entre otros, los
  archivos `sonda16_flags.json`, `sonda19_http_access.log` y
  `sonda16_jobs.sqlite3`;
- `debug_payload_logging_enabled` está en `false`.

Sobre la inspección de esos archivos: el access log revisado muestra
metadatos técnicos (`request_id`, ruta, método, código de estado,
latencia) sin payloads de nacimiento visibles, y la base SQLite interna
contiene estructuras de jobs/requests con columnas JSON en las que, en la
inspección realizada, no se encontraron payloads de nacimiento
(`birth_data`, `birth_data_a`, `birth_data_b`) persistidos. Esto describe
lo observado en la configuración y el runtime actual en el momento de la
inspección, no una garantía absoluta de que `vega-api` nunca procese o
conserve otro tipo de metadatos técnicos conforme a sus propias políticas
de infraestructura — ese extremo requeriría una revisión contractual y de
logging propia de Railway, igual que para el resto de proveedores de esta
sección.

### Railway — contratación y transferencias internacionales

- Railway ofrece un Data Processing Addendum (DPA) propio, que **requiere
  ejecución separada mediante firma (DocuSign)** a través de
  `railway.com/legal/dpa` — no se incorpora automáticamente. Sigue sin
  ejecutarse hoy entre Vega y Railway; es una gestión operativa pendiente
  antes de tráfico real, que no debe realizarse todavía porque la
  identidad del responsable del tratamiento sigue pendiente de decisión.
- Para transferencias de datos fuera del EEE/Reino Unido, el DPA de
  Railway prevé el EU-US/Swiss-US Data Privacy Framework (si el receptor
  está certificado) o, alternativamente, Cláusulas Contractuales Tipo de
  la UE/Reino Unido, incorporadas por referencia.
- Railway publica y mantiene actualizada una lista pública de
  subencargados en su Trust Center (`trust.railway.com`); dicha lista
  puede cambiar sin que este documento se actualice en tiempo real —
  debe consultarse la fuente oficial para el estado vigente. El propio
  DPA exige a Railway notificar con antelación cualquier nuevo
  subencargado no esencial.
- El workload de `vega-api` y su volumen asociado están desplegados en
  la región **EU West Metal (Amsterdam, Países Bajos)**, y Railway
  documenta que los volúmenes siguen la región del servicio al que
  están adjuntos. Esto sitúa ese despliegue y almacenamiento asociado en
  Amsterdam, pero no implica que todo el tratamiento realizado por
  Railway como proveedor ocurra exclusivamente en la UE.
- Railway Corp. es una entidad incorporada en EE. UU., y realiza allí
  sus operaciones principales de tratamiento como proveedor (funciones
  corporativas, de soporte, facturación y determinados subencargados).
  Railway puede efectuar transferencias internacionales asociadas a esas
  operaciones bajo el EU-US/Swiss-US Data Privacy Framework o las
  Cláusulas Contractuales Tipo, conforme a su propio DPA (punto
  anterior) — extremo que deberá confirmarse en la revisión contractual
  definitiva.
- El DPA de Railway define "Personal Data" de forma amplia, como
  cualquier información proporcionada por el cliente en conexión con el
  servicio que se refiera a una persona identificada o identificable —
  esa definición **no excluye expresamente** el contenido que el propio
  servicio Vega escribe en su volumen; su cobertura depende del
  contenido real en cada momento, no de dónde se almacena. La Política
  de Privacidad y el DPA públicos de Railway regulan el tratamiento que
  Railway realiza como plataforma; no documentan públicamente el
  contenido específico que un servicio de cliente escribe en su propio
  volumen. Los archivos observados dentro del volumen de Vega (p. ej. el
  log de acceso HTTP y la base SQLite interna, ya inspeccionados en la
  revisión técnica anterior) son generados por el propio servicio Vega,
  no por Railway — su contenido sigue siendo responsabilidad y
  verificación propias de Vega, con independencia de si ese contenido
  cae o no dentro del alcance del DPA de Railway en un momento dado.

---

## 8. Derechos de los usuarios

El usuario podrá ejercer los derechos que correspondan en materia de protección de datos, incluyendo:

- acceso;
- rectificación;
- supresión;
- oposición, cuando proceda;
- limitación del tratamiento;
- portabilidad, cuando proceda;
- retirada del consentimiento.

**Contacto para ejercer derechos:** [email de privacidad pendiente]

### Canal técnico mínimo — implementación técnica: CERRADA

Para quien tenga una sesión activa (hoy, solo tráfico `?test=1` mientras
el tráfico real sigue suspendido), existe un canal mínimo implementado
y validado con la suite completa en verde:

- `GET /api/privacy/summary` — resumen de los datos asociados a la
  sesión actual (existencia por categoría y metadatos técnicos, nunca
  texto libre ni fecha/hora/lugar de nacimiento en bruto, salvo el
  propio email de waitlist).
- `POST /api/privacy/delete-all` — borra, en una sola solicitud, el
  núcleo de exploración (motivo/texto, perfil de nacimiento propio,
  datos de la segunda persona, evidencia derivada, previews) y la
  entrada de waitlist si existe, y a continuación invalida la sesión
  (`vega_session`, `vega_auid`, `vega_attempt` — nunca `vega_test`). No
  elimina `experiment_users`, `flow_attempts` ni `priced_access_intents`.
- `POST /api/privacy/delete-waitlist` — borra solo la entrada de
  waitlist, sin invalidar la sesión.
- La identidad se verifica únicamente mediante la cookie de sesión
  firmada (`vega_session`), nunca mediante `vega_auid` ni ningún dato
  recibido en la petición.
- Existe una página (`/mis-datos`) que ofrece esto de forma visual, pero
  **todavía no está enlazada** desde esta política ni desde ningún pie
  de página — solo accesible por URL directa.
- No existe ningún registro (logging) específico nuevo de estas
  solicitudes.

Esto es exclusivamente el **estado técnico**. Quedan pendientes, sin que
esta implementación los resuelva, los siguientes puntos jurídicos:

- si una sesión firmada es una verificación de identidad suficiente para
  atender una solicitud de derechos;
- si este resumen es, por sí solo, un mecanismo formal suficiente de
  ejercicio del derecho de acceso del RGPD;
- cómo debe tratarse una solicitud sin sesión activa (hoy, puramente
  manual, sin canal automatizado);
- cómo debe poder ejercer sus derechos la segunda persona del segmento
  B, que no tiene sesión ni acceso propio al sistema (ver
  `VEGA_Segmento_B_Revision_Juridica_v1.md`) — punto de entrada público
  ya implementado en `/datos-de-terceros` (ver sección 9), con el canal
  de contacto real todavía pendiente de la sociedad responsable;
- la identidad y el email de contacto del responsable efectivo del
  tratamiento, todavía pendientes de decisión (ver sección 1).

Ver `VEGA_Plan_Tecnico_Implementacion_Experimento.md`, sección 83, para
el detalle técnico completo.

---

## 9. Datos de terceras personas

El flujo de relaciones de Vega puede permitir introducir datos de otra persona.

La política definitiva del producto deberá regular específicamente:

- qué datos de terceros pueden introducirse;
- para qué se utilizan;
- cuánto tiempo se conservan;
- qué información debe mostrar Vega al usuario;
- qué limitaciones deben aplicarse.

La retención técnica de estos datos brutos durante el experimento ya está implementada y se describe en la sección 5 (eliminación inmediata tras derivación, máximo técnico de 1 hora como fallback, con un margen práctico de hasta 2 horas por la cadencia del cron de limpieza); lo que sigue pendiente aquí son los aspectos de producto — qué mostrar al usuario y qué limitaciones aplicar — antes del lanzamiento del producto completo.

**Implementado el 2026-10-08:** página pública `/datos-de-terceros` ("¿Crees que alguien ha usado tus datos en Vega?"), dirigida específicamente a la segunda persona del Segmento B (que no tiene sesión ni acceso propio al sistema). Enlazada desde esta política (sección 8) y desde el pie de página. Su cierre operativo como medida sustitutiva del art. 14.5.b RGPD sigue pendiente de que exista la sociedad responsable y un canal de privacidad real — ver `VEGA_Analisis_Art14_Segmento_B_v1.md`, bloque 8.

---

## 10. Seguridad

Vega aplica medidas técnicas destinadas a limitar el acceso a los datos y separar la identidad analítica del email de waitlist.

Entre las medidas implementadas en esta fase se incluyen:

- acceso restringido a tablas de waitlist;
- RLS habilitado;
- ausencia de acceso directo para roles `anon` y `authenticated`;
- sesión anónima firmada;
- separación entre email y eventos de PostHog;
- validación de pertenencia de `flowAttemptId`;
- retención automática del email de waitlist: columna `expires_at`
  (`created_at` + 12 meses) con función de purga dedicada
  (`security definer`, sin `EXECUTE` para `anon`/`authenticated`),
  verificada con una fila sintética en una transacción revertida, y con
  limpieza periódica programada manualmente en Supabase (`pg_cron`,
  job `purge-waitlist-expired`, diario);
- retención automática de 30 días para el núcleo de datos personales
  del flujo de exploración (motivo/texto, nacimiento propio): columna
  `delete_after` (`created_at` + 30 días) en cada tabla, función
  consolidada `public.purge_expired_experiment_personal_data()`
  (`security definer`, sin `EXECUTE` para `anon`/`authenticated`),
  verificada con filas sintéticas en una transacción revertida, y con
  limpieza periódica programada manualmente en Supabase (`pg_cron`,
  job `purge-experiment-personal-data-expired`, diario);
- vigencia de 24 horas para la evidencia astrológica derivada de la
  sinastría (Segmento B): columna `delete_after` (`created_at` + 24
  horas, reducida desde 30 días el 2026-10-07 para reforzar el test de
  necesidad del interés legítimo — ver
  `VEGA_Base_Juridica_Segmento_B_v1.md`); esta ventana se justifica
  exclusivamente por la continuidad del propio flujo (evitar recalcular
  si el usuario refresca la página o reintenta en un plazo corto), no
  como una ventana general de revisión posterior. Transcurridas esas 24
  horas, el dato deja de poder reutilizarse para ese fin, con
  independencia de si ya se ha eliminado físicamente (verificado en el
  propio código de lectura, no solo en el plazo de purga). Su
  eliminación física corre a cargo de una función y un `pg_cron`
  dedicados y horarios (`purge_expired_partner_derived_profile()`,
  separados de la función consolidada que purga
  `problem_context`/`user_birth_profile`/`previews`, que mantiene su
  propia cadencia diaria sin cambios), por lo que puede existir un
  margen operativo de hasta aproximadamente 1 hora adicional entre que
  el dato deja de ser válido y se borra;
- retención automática de los datos brutos de nacimiento de segunda
  persona: eliminación inmediata tras derivar la evidencia astrológica
  necesaria y, como máximo, a la hora (reducido desde 24 horas el
  2026-10-07), con limpieza periódica programada manualmente en
  Supabase (`pg_cron`, job `purge-partner-input-expired`, horario)
  como defensa adicional; por la cadencia horaria de ese cron, el
  tiempo real máximo hasta la eliminación de una fila cuyo borrado
  inmediato haya fallado puede aproximarse a 2 horas, no a 1 hora
  exacta.

---

## 11. Cambios futuros

Esta política es específica de la fase beta / waitlist.

Cuando Vega incorpore funcionalidades como:

- cuentas;
- historial;
- pagos;
- facturación;
- datos persistentes de nacimiento;
- datos de terceros;
- soporte;
- comunicaciones comerciales;

será necesario ampliar o sustituir esta política por una política de privacidad completa del servicio.

---

## 12. Pendientes antes de publicación

Antes de utilizar esta política con usuarios reales deben completarse:

1. datos legales de la sociedad responsable;
2. email de privacidad;
3. revisión de proveedores;
4. revisión de transferencias internacionales;
5. procedimiento de retirada de consentimiento;
6. procedimiento de supresión;
7. implementación de retención automática;
8. sustitución del enlace de privacidad de IA LAB por la política propia de Vega;
9. revisión jurídica final.

---

## 13. Estado actual

Este documento es un **borrador de trabajo** para definir la fase beta de Vega.

No debe publicarse como política definitiva hasta completar los campos pendientes y realizar una revisión final.
