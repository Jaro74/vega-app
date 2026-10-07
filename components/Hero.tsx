import Link from "next/link";
import Image from "next/image";
import logo from "@/app/icon.png";
import config from "@/config";

// Hero de la landing de validacion de Vega. Composicion visual simple con
// el logo (no public/hero.png, heredado del boilerplate) en vez de una
// ilustracion nueva.
const Hero = () => {
  return (
    <section className="max-w-7xl mx-auto bg-base-100 flex flex-col lg:flex-row items-center justify-center gap-16 lg:gap-20 px-8 py-8 lg:py-20">
      <div className="flex flex-col gap-6 lg:gap-8 items-center justify-center text-center lg:text-left lg:items-start lg:flex-1">
        <h1 className="font-extrabold text-4xl lg:text-6xl tracking-tight">
          Entiende mejor lo que estás viviendo
        </h1>
        <p className="text-lg opacity-80 leading-relaxed max-w-xl">
          Vega combina tu contexto con información astrológica personalizada
          para ayudarte a explorar una situación de tu vida o de una relación
          desde otra perspectiva.
        </p>
        <Link href="/explorar" className="btn btn-primary btn-wide normal-case">
          Explorar con Vega
        </Link>
        <p className="text-sm opacity-60">Beta experimental · Sin pago real</p>
      </div>
      <div className="flex items-center justify-center lg:flex-shrink-0">
        <Image
          src={logo}
          alt={`Logo de ${config.appName}`}
          className="w-40 h-40 lg:w-64 lg:h-64"
          priority={true}
          width={256}
          height={256}
        />
      </div>
    </section>
  );
};

export default Hero;
