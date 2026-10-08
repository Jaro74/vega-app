import Link from "next/link";
import { getSEOTags } from "@/libs/seo";

export const metadata = getSEOTags({
  title: "Política de Privacidad | Vega",
  description:
    "Información sobre el tratamiento de datos personales en la fase beta de Vega.",
  openGraph: {
    title: "Política de Privacidad | Vega",
    description:
      "Información sobre el tratamiento de datos personales en la fase beta de Vega.",
  },
  canonicalUrlRelative: "/privacy-policy",
});

const PrivacyPolicy = () => {
  return (
    <main className="max-w-3xl mx-auto">
      <div className="p-5">
        <Link href="/" className="btn btn-ghost">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M15 10a.75.75 0 01-.75.75H7.612l2.158 1.96a.75.75 0 11-1.04 1.08l-3.5-3.25a.75.75 0 010-1.08l3.5-3.25a.75.75 0 111.04 1.08L7.612 9.25h6.638A.75.75 0 0115 10z"
              clipRule="evenodd"
            />
          </svg>{" "}
          Volver
        </Link>

        <h1 className="text-3xl font-extrabold pt-4 pb-2">Política de Privacidad de Vega</h1>

        <div className="border-l-4 border-warning bg-warning/10 p-4 rounded mb-8 text-sm leading-relaxed">
          <strong>Aviso:</strong> esta es una versión beta y provisional de la política de
          privacidad de Vega, todavía en fase de borrador interno durante la waitlist / beta
          cerrada. No es una política definitiva ni debe tratarse como tal hasta completar los
          datos legales de la sociedad responsable y finalizar la revisión de proveedores y
          transferencias internacionales descrita más abajo.
        </div>

        <div className="leading-relaxed space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-2">1. Responsable del tratamiento</h2>
            <p>
              <strong>Responsable:</strong> [Sociedad Vega — pendiente de constitución]
              <br />
              <strong>NIF:</strong> [pendiente]
              <br />
              <strong>Domicilio:</strong> [pendiente]
              <br />
              <strong>Email de privacidad:</strong> [pendiente]
            </p>
            <p>Esta información deberá completarse antes de recoger datos de usuarios reales.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">2. Qué datos recogemos en esta fase</h2>
            <p>Durante esta fase, Vega puede tratar:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>el contexto libre que el usuario escribe sobre su situación;</li>
              <li>la fecha de nacimiento propia, y la hora de nacimiento cuando se conoce;</li>
              <li>el lugar de nacimiento propio y las coordenadas asociadas;</li>
              <li>
                en el segmento B, los datos de nacimiento de la otra persona (fecha, y hora/lugar
                si se conocen);
              </li>
              <li>la evidencia astrológica derivada de esos datos;</li>
              <li>la dirección de correo electrónico, en el paso de lista de espera;</li>
              <li>la versión del consentimiento aceptado;</li>
              <li>la fecha de alta en la lista de espera y el estado de la solicitud;</li>
              <li>identificadores técnicos asociados al flujo del experimento;</li>
              <li>
                información técnica y analítica necesaria para medir el funcionamiento de la
                experiencia.
              </li>
            </ul>
            <p>La finalidad de esta fase no es crear todavía una cuenta completa de usuario.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">3. Para qué usamos los datos</h2>
            <p>
              El contexto libre y los datos de nacimiento (propios y, en el segmento B, de la
              otra persona) se utilizan para calcular la evidencia astrológica y generar la
              lectura personalizada del experimento.
            </p>
            <p>El email se utilizará únicamente para:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>gestionar la lista de espera;</li>
              <li>avisar cuando el acceso a Vega esté disponible;</li>
              <li>gestionar una posible invitación a la beta.</li>
            </ul>
            <p>
              No utilizaremos el email de la waitlist para newsletters, promociones o publicidad
              sin una base jurídica o consentimiento independientes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">4. Base jurídica</h2>
            <p>
              El tratamiento del email de la waitlist se basa en el consentimiento prestado
              expresamente por el usuario. El usuario puede retirar ese consentimiento en
              cualquier momento.
            </p>
            <p>
              La base jurídica para el contexto libre, los datos de nacimiento (propios y, en el
              segmento B, de la otra persona) y la evidencia astrológica derivada está pendiente
              de una revisión jurídica específica. Mientras esa revisión no se complete y no
              exista un responsable del tratamiento correctamente identificado, el tráfico real
              del experimento permanece temporalmente suspendido.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">5. Conservación</h2>
            <p>
              El email se conservará como máximo durante <strong>12 meses desde el alta</strong>{" "}
              en la waitlist. Podrá eliminarse antes si el usuario retira el consentimiento,
              solicita la supresión, o deja de existir la finalidad. Si se envía una invitación de
              acceso, el email podrá mantenerse durante un máximo de <strong>90 días</strong> para
              gestionar esa invitación. Si posteriormente el usuario crea una cuenta o utiliza el
              servicio completo, sus datos pasarán a regirse por la política de privacidad
              aplicable a esa nueva fase del producto.
            </p>
            <p>
              El plazo de conservación del contexto libre, los datos de nacimiento (propios y, en
              el segmento B, de la otra persona) y la evidencia astrológica derivada está
              igualmente pendiente de esa misma revisión jurídica. Mientras no se complete y no
              exista un responsable del tratamiento correctamente identificado, el tráfico real
              del experimento permanece temporalmente suspendido.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">6. Analítica</h2>
            <p>
              Vega prevé utilizar herramientas de analítica (PostHog) para entender cómo funciona
              el experimento y mejorar la experiencia. Mientras el tráfico real del experimento
              permanece temporalmente suspendido, PostHog no recibe ningún tráfico real.
            </p>
            <p>
              Cuando el experimento vuelva a estar habilitado, el email de la waitlist no se
              enviará como propiedad de ningún evento analítico, y los eventos del experimento
              seguirán utilizando identificadores técnicos separados del email.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">7. Proveedores y encargados del tratamiento</h2>
            <p>Vega utiliza o prevé utilizar los siguientes proveedores durante esta fase beta:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Supabase;</li>
              <li>PostHog;</li>
              <li>Railway / infraestructura de Vega;</li>
              <li>OpenAI;</li>
              <li>cualquier proveedor adicional que intervenga en almacenamiento, analítica o generación.</li>
            </ul>
            <p>
              Algunos aspectos contractuales y de transferencias internacionales siguen
              pendientes de formalización antes de reabrir el experimento a usuarios reales. Para
              cada proveedor, esta sección detalla:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>finalidad;</li>
              <li>datos tratados;</li>
              <li>ubicación del tratamiento;</li>
              <li>condiciones contractuales;</li>
              <li>posibles transferencias internacionales;</li>
              <li>medidas aplicables.</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-2">Supabase</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Supabase actúa como proveedor de infraestructura y base de datos principal del
                proyecto. La base de datos principal está desplegada en{" "}
                <strong>West EU (Ireland), región eu-west-1</strong>.
              </li>
              <li>
                Supabase dispone de un Acuerdo de Tratamiento de Datos (DPA) propio y puede
                recurrir a subencargados del tratamiento.
              </li>
              <li>
                Para posibles transferencias internacionales de datos fuera del Espacio Económico
                Europeo, el marco contractual puede apoyarse en mecanismos como las Cláusulas
                Contractuales Tipo (SCCs), según corresponda en cada caso.
              </li>
              <li>
                El DPA definitivo entre Vega y Supabase queda{" "}
                <strong>pendiente de formalización</strong> hasta que exista la sociedad
                responsable del tratamiento.
              </li>
              <li>
                Esto no implica que la totalidad de los tratamientos de Supabase ocurran
                exclusivamente dentro de la Unión Europea — algunos subencargados o funciones de
                soporte pueden operar fuera del EEE bajo las garantías contractuales aplicables,
                extremo que deberá confirmarse en la revisión contractual definitiva.
              </li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-2">PostHog</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Vega utiliza <strong>PostHog Cloud EU</strong>, con infraestructura europea, para
                analítica de producto.
              </li>
              <li>
                El email de la waitlist no se envía como propiedad de ningún evento de analítica
                (ver sección 6).
              </li>
              <li>
                PostHog dispone de un DPA propio y puede recurrir a subencargados del tratamiento.
              </li>
              <li>
                Para posibles transferencias internacionales, PostHog contempla mecanismos como el{" "}
                <strong>EU-US Data Privacy Framework</strong> y/o{" "}
                <strong>Cláusulas Contractuales Tipo (SCCs)</strong>, según corresponda.
              </li>
              <li>
                La formalización del DPA entre Vega y PostHog queda <strong>pendiente</strong>{" "}
                hasta que exista la sociedad responsable del tratamiento.
              </li>
              <li>
                Esto no implica que absolutamente todo el procesamiento de PostHog se limite
                físicamente a la Unión Europea — determinadas funciones de soporte o subencargados
                pueden operar fuera del EEE bajo las garantías contractuales aplicables, extremo
                que deberá confirmarse en la revisión contractual definitiva.
              </li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-2">OpenAI — detalle técnico ya verificado</h3>
            <p>
              A fecha de esta revisión, el tratamiento técnico de datos hacia OpenAI para la
              generación de previews es el siguiente:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Vega utiliza la Responses API de OpenAI con Structured Outputs (salida forzada a
                un esquema JSON fijo).
              </li>
              <li>
                Las llamadas se realizan con <strong>store: false</strong>: OpenAI no retiene la
                respuesta para recuperación posterior vía API.
              </li>
              <li>
                No se utilizan la Conversations API, Files, vector stores ni
                previous_response_id — cada llamada es independiente, sin encadenar estado entre
                peticiones.
              </li>
              <li>
                No se envían a OpenAI: el email de la waitlist, el anonymousUserId, el
                flowAttemptId, ni la fecha, hora o lugar de nacimiento, ni coordenadas.
              </li>
              <li>
                Sí se envían: la categoría del problema (trigger), el texto libre que el usuario
                escribe sobre su situación, los indicadores de precisión/conocimiento de hora, y
                la evidencia astrológica ya calculada por Vega/Railway (sin datos de nacimiento en
                bruto).
              </li>
              <li>
                Esta configuración reduce la persistencia de OpenAI sobre estas llamadas
                concretas, pero no sustituye la revisión contractual pendiente: el tratamiento
                técnico que OpenAI pueda realizar fuera de esa persistencia desactivada
                (procesamiento de la petición, medidas de abuso/seguridad, obligaciones legales,
                etc.) sigue sujeto a sus condiciones y políticas aplicables, que deben revisarse
                igualmente antes de publicar esta política.
              </li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-2">
              OpenAI — contratación y transferencias internacionales
            </h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                OpenAI ofrece un Data Processing Addendum (DPA), incorporado a su Services
                Agreement, que cubre GDPR y contempla a los clientes del EEE bajo OpenAI Ireland
                Ltd. La futura sociedad responsable de Vega deberá revisar, documentar y, cuando
                proceda, ejecutar/formalizar ese DPA con sus propios datos legales antes de tratar
                datos de usuarios reales.
              </li>
              <li>
                Para transferencias de datos desde el EEE/Suiza fuera de esas regiones, el DPA de
                OpenAI prevé que OpenAI Ireland utilice Cláusulas Contractuales Tipo (SCCs) o una
                decisión de adecuación aplicable, según corresponda.
              </li>
              <li>
                OpenAI publica y mantiene actualizada una lista de subencargados (subprocessors)
                en su sitio oficial; dicha lista puede cambiar sin que este documento se actualice
                en tiempo real — debe consultarse la fuente oficial de OpenAI para el estado
                vigente.
              </li>
              <li>
                OpenAI ofrece una región de tratamiento específica para Europa (EEA + Suiza) para
                clientes de API, configurable por proyecto. Acceder a esa residencia europea
                requiere, según la documentación vigente de OpenAI, cumplir requisitos adicionales
                de elegibilidad/configuración, incluidos controles de monitorización de abuso
                aprobados y la ejecución del correspondiente Modified Retention amendment.{" "}
                <strong>Vega no tiene activada esta configuración hoy</strong>: las llamadas
                actuales usan el endpoint global por defecto de la API (Responses API), no el
                endpoint europeo — queda identificado como una mejora pendiente, no como una
                garantía ya cumplida.
              </li>
              <li>
                OpenAI declara que los datos enviados vía API no se usan para entrenar sus modelos
                por defecto, y mantiene logs de monitorización de abuso/seguridad durante un plazo
                estándar (hasta 30 días) bajo configuración estándar, independientemente de que
                nuestras llamadas usen store: false — ese parámetro limita la persistencia de la
                respuesta para recuperación posterior, pero no excluye por sí solo esos logs de
                seguridad.
              </li>
              <li>
                Existen opciones contractuales adicionales de OpenAI, como Zero Data Retention
                (ZDR) o Modified Abuse Monitoring (MAM), sujetas a aprobación previa de OpenAI (no
                autoservicio) y a un caso de uso elegible.{" "}
                <strong>Vega no las ha solicitado ni tiene ninguna de ellas aprobada hoy.</strong>
              </li>
              <li>
                Recordatorio de alcance (ya documentado en la subsección anterior): Vega no envía
                a OpenAI el email de la waitlist, el anonymousUserId, el flowAttemptId, ni
                fecha/hora/lugar de nacimiento en bruto.
              </li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-2">
              Railway / Vega API — detalle técnico ya verificado
            </h3>
            <p>
              Vega utiliza una API propia desplegada en Railway (&quot;vega-api&quot;) para
              calcular la evidencia astrológica. Verificado a fecha de esta revisión:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                La región actual del servicio vega-api y de su volumen asociado es{" "}
                <strong>EU West (Amsterdam, Países Bajos)</strong>, tras una migración desde US
                West.
              </li>
              <li>
                <strong>Segmento A:</strong> se usa POST /evidence/natal.
              </li>
              <li>
                <strong>Segmento B:</strong> se usa POST /evidence/synastry.
              </li>
              <li>
                Railway/Vega procesa, para calcular esa evidencia: fecha de nacimiento, hora
                (solo si es conocida), zona horaria y coordenadas (latitud/longitud).
              </li>
              <li>
                Railway/Vega <strong>no</strong> recibe: el email de la waitlist, el
                anonymousUserId, el flowAttemptId, ni el nombre de la ciudad — solo recibe un
                request_id efímero generado por cada llamada, sin relación directa con la
                identidad del experimento.
              </li>
              <li>
                Las respuestas de Railway/Vega devuelven evidencia ya derivada e identificadores
                técnicos de carta (chart_id) y de contexto de precisión/hora conocida, pero{" "}
                <strong>no</strong> devuelven de nuevo la fecha, hora o lugar en bruto enviados.
              </li>
              <li>
                Tras la migración a Amsterdam, se validaron POST /evidence/natal y POST
                /evidence/synastry con datos sintéticos (nunca datos de usuarios reales): ambas
                llamadas devolvieron 200 y la respuesta superó los validadores reales de la
                aplicación.
              </li>
            </ul>
            <p>
              Adicionalmente, el equipo operador confirmó directamente en el entorno de Railway
              (fuera del alcance de esta revisión de código, que no tiene acceso al dashboard ni
              al sistema de archivos del servicio):
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                el volumen /app/runtime sigue montado y conserva, entre otros, archivos técnicos
                de flags, de log de acceso HTTP y de una base de datos interna de jobs;
              </li>
              <li>el registro detallado de payloads está desactivado.</li>
            </ul>
            <p>
              Sobre la inspección de esos archivos: el log de acceso revisado muestra metadatos
              técnicos (identificador de petición, ruta, método, código de estado, latencia) sin
              payloads de nacimiento visibles, y la base de datos interna contiene estructuras de
              jobs/peticiones en las que, en la inspección realizada, no se encontraron payloads
              de nacimiento persistidos. Esto describe lo observado en la configuración y el
              runtime actual en el momento de la inspección, no una garantía absoluta de que
              Railway/Vega nunca procese o conserve otro tipo de metadatos técnicos conforme a sus
              propias políticas de infraestructura — ese extremo requeriría una revisión
              contractual y de logging propia de Railway, igual que para el resto de proveedores
              de esta sección.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-2">
              Railway — contratación y transferencias internacionales
            </h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Railway ofrece un Data Processing Addendum (DPA) propio, ejecutable mediante firma
                a través de su sitio legal. <strong>Ese DPA no está formalizado hoy entre Vega
                y Railway</strong> — la futura sociedad responsable deberá revisarlo,
                documentarlo y, cuando proceda, ejecutarlo con sus propios datos legales antes de
                tratar datos de usuarios reales.
              </li>
              <li>
                Para transferencias de datos fuera del EEE/Reino Unido, el DPA de Railway prevé el
                EU-US/Swiss-US Data Privacy Framework (si el receptor está certificado) o,
                alternativamente, Cláusulas Contractuales Tipo de la UE/Reino Unido, incorporadas
                por referencia.
              </li>
              <li>
                Railway publica y mantiene actualizada una lista pública de subencargados en su
                Trust Center; dicha lista puede cambiar sin que este documento se actualice en
                tiempo real — debe consultarse la fuente oficial para el estado vigente. El propio
                DPA exige a Railway notificar con antelación cualquier nuevo subencargado no
                esencial.
              </li>
              <li>
                El workload de vega-api y su volumen asociado están desplegados en la región{" "}
                <strong>EU West Metal (Amsterdam, Países Bajos)</strong>, y Railway documenta que
                los volúmenes siguen la región del servicio al que están adjuntos. Esto sitúa ese
                despliegue y almacenamiento asociado en Amsterdam, pero no implica que todo el
                tratamiento realizado por Railway como proveedor ocurra exclusivamente en la UE.
              </li>
              <li>
                Railway Corp. es una entidad incorporada en EE. UU., y realiza allí sus
                operaciones principales de tratamiento como proveedor (funciones corporativas, de
                soporte, facturación y determinados subencargados). Railway puede efectuar
                transferencias internacionales asociadas a esas operaciones bajo el EU-US/Swiss-US
                Data Privacy Framework o las Cláusulas Contractuales Tipo, conforme a su propio
                DPA — extremo que deberá confirmarse en la revisión contractual definitiva.
              </li>
              <li>
                La Política de Privacidad y el DPA públicos de Railway regulan el tratamiento que
                Railway realiza como plataforma; <strong>no documentan públicamente el
                contenido específico que un servicio de cliente escribe en su propio
                volumen</strong>. Los archivos observados dentro del volumen de Vega son
                generados por el propio servicio Vega, no por Railway — su retención y contenido
                siguen siendo responsabilidad y verificación propias de Vega, no una garantía de
                Railway.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">8. Derechos de los usuarios</h2>
            <p>
              El usuario podrá ejercer los derechos que correspondan en materia de protección de
              datos, incluyendo:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>acceso;</li>
              <li>rectificación;</li>
              <li>supresión;</li>
              <li>oposición, cuando proceda;</li>
              <li>limitación del tratamiento;</li>
              <li>portabilidad, cuando proceda;</li>
              <li>retirada del consentimiento.</li>
            </ul>
            <p>
              <strong>Contacto para ejercer derechos:</strong> [email de privacidad pendiente]
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">9. Datos de terceras personas</h2>
            <p>El flujo de relaciones de Vega puede permitir introducir datos de otra persona.</p>
            <p>
              Si crees que tus datos han sido introducidos en Vega por otra persona, consulta{" "}
              <Link href="/datos-de-terceros" className="link link-primary">
                ¿Crees que alguien ha usado tus datos en Vega?
              </Link>
              .
            </p>
            <p>La política definitiva del producto deberá regular específicamente:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>qué datos de terceros pueden introducirse;</li>
              <li>para qué se utilizan;</li>
              <li>cuánto tiempo se conservan;</li>
              <li>qué información debe mostrar Vega al usuario;</li>
              <li>qué limitaciones deben aplicarse.</li>
            </ul>
            <p>Este punto requiere una revisión específica antes del lanzamiento del producto completo.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">10. Seguridad</h2>
            <p>
              Vega aplica medidas técnicas destinadas a limitar el acceso a los datos y separar la
              identidad analítica del email de waitlist. Entre las medidas implementadas en esta
              fase se incluyen:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>acceso restringido a tablas de waitlist;</li>
              <li>RLS habilitado;</li>
              <li>ausencia de acceso directo para roles anon y authenticated;</li>
              <li>sesión anónima firmada;</li>
              <li>separación entre email y eventos de PostHog;</li>
              <li>validación de pertenencia de flowAttemptId;</li>
              <li>
                retención automática del email de waitlist: columna expires_at (created_at + 12
                meses) con función de purga dedicada (security definer, sin EXECUTE para
                anon/authenticated), verificada con una fila sintética en una transacción
                revertida, y con limpieza periódica programada manualmente en Supabase (pg_cron).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">11. Cambios futuros</h2>
            <p>Esta política es específica de la fase beta / waitlist.</p>
            <p>Cuando Vega incorpore funcionalidades como:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>cuentas;</li>
              <li>historial;</li>
              <li>pagos;</li>
              <li>facturación;</li>
              <li>datos persistentes de nacimiento;</li>
              <li>datos de terceros;</li>
              <li>soporte;</li>
              <li>comunicaciones comerciales;</li>
            </ul>
            <p>
              será necesario ampliar o sustituir esta política por una política de privacidad
              completa del servicio.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
};

export default PrivacyPolicy;
