interface Step {
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    title: "Eliges qué quieres explorar",
    description: "Nos cuentas brevemente qué está pasando.",
  },
  {
    title: "Añades los datos necesarios",
    description:
      "Vega utiliza tu información de nacimiento y, en relaciones, también la de la otra persona.",
  },
  {
    title: "Recibes una lectura personalizada",
    description:
      "Combinamos tu contexto con evidencia astrológica calculada específicamente para tu caso.",
  },
];

const HowItWorks = () => {
  return (
    <section className="bg-base-200">
      <div className="max-w-5xl mx-auto px-8 py-16 md:py-24">
        <h2 className="font-extrabold text-3xl md:text-4xl tracking-tight text-center mb-12">
          Cómo funciona
        </h2>
        <div className="grid gap-10 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.title} className="flex flex-col items-center text-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-content font-bold">
                {index + 1}
              </span>
              <h3 className="font-semibold text-lg">{step.title}</h3>
              <p className="opacity-80">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
