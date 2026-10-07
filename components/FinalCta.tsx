import Link from "next/link";

const FinalCta = () => {
  return (
    <section className="bg-base-200">
      <div className="max-w-3xl mx-auto px-8 py-16 md:py-24 text-center flex flex-col items-center gap-6">
        <h2 className="font-extrabold text-3xl md:text-4xl tracking-tight">
          ¿Quieres probarlo?
        </h2>
        <p className="text-lg opacity-80">
          Explora una situación real y descubre qué puede aportar Vega.
        </p>
        <Link href="/explorar" className="btn btn-primary btn-wide normal-case">
          Empezar
        </Link>
      </div>
    </section>
  );
};

export default FinalCta;
