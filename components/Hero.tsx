import Image from "next/image";
import TestimonialsAvatars from "./TestimonialsAvatars";
import config from "@/config";

const Hero = () => {
  return (
    <section className="max-w-7xl mx-auto bg-base-100 flex flex-col lg:flex-row items-center justify-center gap-16 lg:gap-20 px-8 py-8 lg:py-20">
      <div className="flex flex-col gap-10 lg:gap-14 items-center justify-center text-center lg:text-left lg:items-start">
        <h1 className="font-extrabold text-4xl lg:text-6xl tracking-tight md:-mb-4">
          Lanza tu idea en dias, no en semanas
        </h1>
        <p className="text-lg opacity-80 leading-relaxed">
          El Kit con todo lo que necesitas para construir tu SaaS, herramienta
          de IA, o cualquier otra app web. De la idea a produccion en menos de
          1 semana.
        </p>
        <button className="btn btn-primary btn-wide">
          Obtener {config.appName}
        </button>

        <TestimonialsAvatars />
      </div>
      <div className="lg:w-full">
        <Image
          src="/hero.png"
          alt="Kit para lanzar tu idea"
          className="w-full"
          priority={true}
          width={500}
          height={500}
        />
      </div>
    </section>
  );
};

export default Hero;
