import Link from "next/link";

interface ExploreOption {
  title: string;
  description: string;
}

const OPTIONS: ExploreOption[] = [
  {
    title: "Algo que está pasando en mi vida",
    description:
      "Para entender mejor una etapa, decisión, cambio o situación personal.",
  },
  {
    title: "Algo que está pasando en una relación",
    description:
      "Para explorar una dinámica con otra persona desde una perspectiva astrológica.",
  },
];

// Las dos opciones llevan a /explorar sin preseleccionar segmento: la
// eleccion real de segmento sigue viviendo exclusivamente en
// app/explorar/page.tsx, esta seccion no la duplica ni la adelanta.
const WhatToExplore = () => {
  return (
    <section className="bg-base-100">
      <div className="max-w-5xl mx-auto px-8 py-16 md:py-24">
        <h2 className="font-extrabold text-3xl md:text-4xl tracking-tight text-center mb-12">
          ¿Qué quieres explorar?
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {OPTIONS.map((option) => (
            <Link
              key={option.title}
              href="/explorar"
              className="card bg-base-200 hover:bg-base-300 transition-colors"
            >
              <div className="card-body">
                <h3 className="card-title text-lg">{option.title}</h3>
                <p className="opacity-80">{option.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhatToExplore;
