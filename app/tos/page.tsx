import Link from "next/link";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";

// CHATGPT PROMPT TO GENERATE YOUR TERMS & SERVICES — replace with your own data 👇

// 1. Go to https://chat.openai.com/
// 2. Copy paste bellow
// 3. Replace the data with your own (if needed)
// 4. Paste the answer from ChatGPT directly in the <pre> tag below

// You are an excellent lawyer.

// I need your help to write a simple Terms & Services for my website. Here is some context:
// - Website: https://
// - Name: ShipFast
// - Contact information: marc@shipfa.st
// - Description: A JavaScript code boilerplate to help entrepreneurs launch their startups faster
// - Ownership: when buying a package, users can download code to create apps. They own the code but they do not have the right to resell it. They can ask for a full refund within 7 day after the purchase.
// - User data collected: name, email and payment information
// - Non-personal data collection: web cookies
// - Link to privacy-policy: https://shipfa.st/privacy-policy
// - Governing Law: France
// - Updates to the Terms: users will be updated by email

// Please write a simple Terms & Services for my site. Add the current date. Do not add or explain your reasoning. Answer:

export const metadata = getSEOTags({
  title: `Terminos y Condiciones | ${config.appName}`,
  canonicalUrlRelative: "/tos",
});

const TOS = () => {
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
          </svg>
          Volver
        </Link>
        <h1 className="text-3xl font-extrabold pb-6">
          Terminos y Condiciones de {config.appName}
        </h1>

        <pre
          className="leading-relaxed whitespace-pre-wrap"
          style={{ fontFamily: "sans-serif" }}
        >
          {`Ultima modificacion, Noviembre 2025

Bienvenido a IA LAB

Estos Terminos de Servicio ("Terminos") rigen el uso del sitio web de IA LAB en https://ialab.dev ("Sitio Web") y los servicios proporcionados por IA LAB. Al utilizar nuestro Sitio Web y servicios, usted acepta estos Terminos.

1. Descripcion de IA LAB

IA LAB es una plataforma de software de prospeccion impulsada por inteligencia artificial, disenada para ayudar a empresas y profesionales a identificar, gestionar y conectar con clientes potenciales de manera mas eficiente.

2. Propiedad y Derechos de Uso

Cuando adquiere un plan de IA LAB, obtiene el derecho de acceder y utilizar las funcionalidades del software segun el plan contratado. Los datos e informes generados a traves de su uso le pertenecen, pero no tiene derecho a revender, redistribuir ni sublicenciar el software. Ofrecemos un reembolso completo dentro de los 7 dias posteriores a la compra, segun lo especificado en nuestra politica de reembolso.

3. Datos del Usuario y Privacidad

Recopilamos y almacenamos datos del usuario, incluyendo nombre, correo electronico e informacion de pago, segun sea necesario para proporcionar nuestros servicios. Para obtener detalles sobre como manejamos sus datos, consulte nuestra Politica de Privacidad en https://ialab.dev/privacy-policy.

4. Recopilacion de Datos No Personales

Utilizamos cookies web para recopilar datos no personales con el fin de mejorar nuestros servicios y la experiencia del usuario.

5. Legislacion Aplicable

Estos Terminos se rigen por las leyes de Espana.

6. Actualizaciones de los Terminos

Podemos actualizar estos Terminos de vez en cuando. Los usuarios seran notificados de cualquier cambio por correo electronico.

Para cualquier pregunta o inquietud sobre estos Terminos de Servicio, contactenos en contacto@ialab.dev.

Gracias por usar IA LAB.`}
        </pre>
      </div>
    </main>
  );
};

export default TOS;
