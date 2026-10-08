import Link from "next/link";
import { getSEOTags } from "@/libs/seo";

export const metadata = getSEOTags({
  title: "¿Crees que alguien ha usado tus datos en Vega? | Vega",
  description:
    "Información para quien no es usuario de Vega pero cree que sus datos de nacimiento pueden haber sido introducidos por otra persona.",
  openGraph: {
    title: "¿Crees que alguien ha usado tus datos en Vega? | Vega",
    description:
      "Información para quien no es usuario de Vega pero cree que sus datos de nacimiento pueden haber sido introducidos por otra persona.",
  },
  canonicalUrlRelative: "/datos-de-terceros",
});

// Pagina publica para la "segunda persona" del Segmento B (nunca tiene
// sesion ni acceso propio al sistema) -- medida de informacion publica
// prevista conforme al art. 14.5.b RGPD (VEGA_Analisis_Art14_Segmento_B_v1.md,
// bloque 8). No sustituye consentimiento ni atribuye ninguna obligacion.
// No se afirma que la medida sea ya plenamente operativa: el canal de
// contacto real depende de que exista la sociedad responsable (ver
// seccion 12) -- hasta entonces, esta pagina es informativa.
const DatosDeTerceros = () => {
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

        <h1 className="text-3xl font-extrabold pt-4 pb-2">
          ¿Crees que alguien ha usado tus datos en Vega?
        </h1>

        <div className="border-l-4 border-warning bg-warning/10 p-4 rounded mb-8 text-sm leading-relaxed">
          <strong>Aviso:</strong> Vega está en fase beta, con el tráfico real todavía suspendido.
          Esta página es informativa y se irá completando antes de abrir tráfico real.
        </div>

        <div className="leading-relaxed space-y-8">
          <section>
            <p>
              Si crees que alguien puede haber introducido tus datos de nacimiento en Vega para
              calcular una compatibilidad astrológica contigo, esta página es para ti.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">Qué es Vega</h2>
            <p>
              Vega es un experimento en fase beta que calcula lecturas astrológicas. Una de sus
              funciones (el &quot;Segmento B&quot;) permite a un usuario introducir la fecha de
              nacimiento de otra persona —y, si la conoce, su hora y lugar— para calcular una
              compatibilidad entre ambos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">Qué datos puede haber introducido otra persona sobre ti</h2>
            <p>
              Como máximo: tu fecha de nacimiento; tu hora de nacimiento, si la persona que te
              introdujo la conocía; tu lugar de nacimiento, como ciudad y coordenadas aproximadas
              (nunca una dirección). Vega no pide ni recibe tu nombre, tu email, tu teléfono ni
              ningún otro dato que te identifique directamente.
            </p>
            <p>
              <strong>
                Esta página no implica que tus datos estén necesariamente guardados en Vega
              </strong>{" "}
              — solo explica qué ocurriría si lo estuvieran.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">De dónde proceden esos datos</h2>
            <p>
              Estos datos los aporta la otra persona, no tú. Vega nunca contacta directamente
              contigo para pedírtelos ni para confirmarte si existen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">Para qué se usan</h2>
            <p>
              Exclusivamente para calcular, puntualmente, una lectura de compatibilidad
              astrológica solicitada por esa otra persona.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">Base jurídica</h2>
            <p>
              Vega trata estos datos bajo la base del interés legítimo (art. 6.1.f RGPD), tras una
              evaluación interna de necesidad, proporcionalidad y salvaguardas. Esta evaluación es
              una posición jurídica interna de Vega, no una resolución de una autoridad de
              control.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">Quién puede llegar a tratarlos</h2>
            <p>
              Proveedores que actúan, con carácter general, por instrucción de Vega: un proveedor
              de infraestructura y base de datos; un servicio de cálculo astrológico propio de
              Vega, desplegado sobre infraestructura de un proveedor externo; y un proveedor de
              generación de texto. Estos proveedores pueden realizar además, bajo sus propias
              políticas, tratamientos accesorios de seguridad, prevención de abuso o cumplimiento
              legal (por ejemplo, registros de seguridad con una retención breve) — Vega no
              garantiza que esos tratamientos accesorios queden excluidos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">Transferencias internacionales</h2>
            <p>
              Alguno de estos proveedores puede tratar datos fuera del Espacio Económico Europeo.
              En esos casos se aplicarán las garantías correspondientes conforme al RGPD; el
              detalle concreto de esas garantías se completará, junto con el resto de la revisión
              contractual pendiente, antes de abrir tráfico real.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">Cuánto tiempo se conservan</h2>
            <p>
              El dato de nacimiento en bruto se elimina de forma inmediata en el funcionamiento
              normal, tras calcular el resultado. Como red de seguridad técnica, existe un
              fallback de borrado a la hora, reforzado por una purga horaria programada; en el
              caso excepcional de que el borrado inmediato no se produjera, el dato podría
              permanecer físicamente, como máximo, hasta aproximadamente 2 horas.
            </p>
            <p>
              El resultado calculado (sin el dato en bruto) deja de poder reutilizarse
              transcurridas 24 horas; su eliminación física corre a cargo de una purga horaria
              dedicada, con un margen físico adicional de hasta aproximadamente 1 hora.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">Tus derechos y cómo ejercerlos</h2>
            <p>
              Cuando el canal de privacidad esté operativo, podrás ejercer, cuando resulte
              aplicable, los derechos de acceso, rectificación, supresión, limitación del
              tratamiento y oposición. La portabilidad no resulta aplicable a este tratamiento,
              basado en interés legítimo; tampoco existe un consentimiento que retirar, porque el
              consentimiento no es la base jurídica utilizada.
            </p>
            <p>
              Como Vega no tiene ningún dato que te identifique, no podrá confirmar de entrada si
              existe un tratamiento sobre ti — para localizarlo, se te pedirá solo la información
              mínima y razonable que tú podrías conocer, nunca más de lo necesario, y nunca que
              identifiques a la otra persona.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">Tu derecho a reclamar</h2>
            <p>
              Puedes reclamar en cualquier momento ante la Agencia Española de Protección de
              Datos (AEPD), con independencia de que contactes antes con nosotros.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">Por qué esta información está aquí</h2>
            <p>
              Al no disponer de ningún dato que permita contactarte directamente, y dado que
              obtenerlo expresamente para este fin aumentaría el tratamiento sobre ti, Vega ha
              adoptado, como posición jurídica interna con <strong>confianza moderada</strong>{" "}
              (sujeta a revisión), informarte mediante esta página en lugar de notificarte de
              forma individual (art. 14.5.b RGPD).
            </p>
            <p>
              Esta medida está en preparación: su cierre operativo como medida sustitutiva
              completa queda pendiente de que exista un responsable efectivo y un canal de
              privacidad real (ver más abajo). Esto no sustituye ningún consentimiento ni te
              atribuye ninguna obligación.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">Contacto</h2>
            <p>
              Vega todavía no está abierto a tráfico real. Antes de la apertura se habilitará
              aquí el canal específico de privacidad de la sociedad responsable para ejercer tus
              derechos o plantear consultas sobre datos de terceras personas.
            </p>
            <p>
              Mientras ese canal no exista, esta página es informativa, y la medida prevista
              conforme al art. 14.5.b RGPD no se considera todavía plenamente operativa.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
};

export default DatosDeTerceros;
