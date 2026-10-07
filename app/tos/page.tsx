import Link from "next/link";
import { getSEOTags } from "@/libs/seo";

export const metadata = getSEOTags({
  title: "Términos y Condiciones | Vega",
  description:
    "Aviso provisional sobre los términos y condiciones de la fase beta de Vega.",
  openGraph: {
    title: "Términos y Condiciones | Vega",
    description:
      "Aviso provisional sobre los términos y condiciones de la fase beta de Vega.",
  },
  canonicalUrlRelative: "/tos",
});

const TOS = () => {
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

        <h1 className="text-3xl font-extrabold pt-4 pb-2">Términos y Condiciones de Vega</h1>

        <div className="border-l-4 border-warning bg-warning/10 p-4 rounded mb-8 text-sm leading-relaxed">
          <strong>Aviso:</strong> esta página es un aviso provisional sobre los términos y
          condiciones de Vega, durante la fase beta/experimento. No es un documento contractual
          definitivo ni debe interpretarse como tal.
        </div>

        <div className="leading-relaxed space-y-4">
          <p>
            Vega se encuentra actualmente en fase beta/experimento. No existe todavía un servicio
            comercial definitivo ni una relación contractual completa con los usuarios.
          </p>
          <p>
            En esta fase no se realizan cobros ni se solicitan datos de tarjeta. Cualquier precio
            que se muestre durante el experimento forma parte de una prueba de intención de
            acceso y no constituye una compra.
          </p>
          <p>
            La sociedad responsable de Vega está pendiente de constitución. Hasta que exista y
            quede correctamente identificada, no existen términos contractuales definitivos.
          </p>
          <p>
            Los términos y condiciones completos se publicarán antes de ofrecer cualquier acceso
            de pago real.
          </p>
          <p>
            Esta página es un aviso provisional y no debe interpretarse como unas condiciones
            contractuales finales.
          </p>
        </div>
      </div>
    </main>
  );
};

export default TOS;
