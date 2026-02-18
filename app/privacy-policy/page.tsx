import Link from "next/link";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";

// Prompt para la IA, reemplaza los datos con los tuyos

//Eres un excelente abogado.

//Necesito tu ayuda para redactar una política de privacidad sencilla para mi sitio web. Aquí tienes el contexto:
// - Sitio web: https://ialab.dev
// - Nombre: IA LAB
// - Descripción: Un software de prospección impulsado por inteligencia artificial para ayudar a empresas a identificar y conectar con clientes potenciales
// - Datos de usuario recopilados: nombre, correo electrónico e información de pago
// - Recopilación de datos no personales: cookies web
// - Finalidad de la recopilación de datos: procesamiento de pedidos y prestación del servicio
// - Compartición de datos: no compartimos los datos con terceros
// - Privacidad de los niños: no recopilamos datos de menores de edad
// - Actualizaciones de la política de privacidad: los usuarios serán notificados por correo electrónico
// - Información de contacto: contacto@ialab.dev

//Por favor, redacta una política de privacidad sencilla para mi sitio. Añade la fecha actual. No añadas ni expliques tu razonamiento. Respuesta:

export const metadata = getSEOTags({
  title: `Politica de Privacidad | ${config.appName}`,
  canonicalUrlRelative: "/privacy-policy",
});

const PrivacyPolicy = () => {
  return (
    <main className="max-w-xl mx-auto">
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
        <h1 className="text-3xl font-extrabold pb-6">
          Politica de Privacidad de {config.appName}
        </h1>

        <pre
          className="leading-relaxed whitespace-pre-wrap"
          style={{ fontFamily: "sans-serif" }}
        >
          {`Fecha de vigencia: 21 de enero de 2026

En IA LAB, accesible desde https://ialab.dev, la privacidad de nuestros usuarios es una de nuestras principales prioridades. Esta Política de Privacidad describe los tipos de información que recopilamos y cómo la utilizamos.

1. Información que Recopilamos

Recopilamos los siguientes datos personales cuando utiliza nuestros servicios:
- Nombre
- Correo electrónico
- Información de pago

2. Recopilación de Datos No Personales

Utilizamos cookies web para mejorar su experiencia en nuestro sitio. Estas cookies recopilan información no personal sobre su navegación.

3. Uso de la Información

Utilizamos la información recopilada únicamente para los siguientes fines:
- Procesamiento de pedidos y gestión de suscripciones
- Prestación de nuestros servicios de prospección con inteligencia artificial
- Comunicación relacionada con su cuenta y nuestros servicios

4. Compartición de Datos

No compartimos sus datos personales con terceros. Su información permanece confidencial y se utiliza exclusivamente para los fines descritos en esta política.

5. Privacidad de los Niños

Nuestros servicios no están dirigidos a menores de edad. No recopilamos conscientemente información personal de niños.

6. Actualizaciones de esta Política

Podemos actualizar esta Política de Privacidad ocasionalmente. Los usuarios serán notificados de cualquier cambio mediante correo electrónico.

7. Contacto

Si tiene alguna pregunta sobre esta Política de Privacidad, puede contactarnos en: contacto@ialab.dev
`}
        </pre>
      </div>
    </main>
  );
};

export default PrivacyPolicy;
