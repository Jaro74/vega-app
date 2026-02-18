"use client";

import { useRef, useState, memo } from "react";
import type { JSX } from "react";

// El componente <FAQ> es una lista de componentes <Item>
// Solo importa el FAQ y agrega tu contenido de FAQ al array faqList abajo.

interface FAQItemProps {
  question: string;
  answer: JSX.Element;
}

const faqList: FAQItemProps[] = [
  {
    question: "Que incluye exactamente el kit?",
    answer: (
      <div className="space-y-2 leading-relaxed">
        Incluye una plantilla Next.js 15 completa con autenticacion (Supabase),
        pagos (Stripe), emails (Resend), 30+ componentes, dashboard protegido,
        SEO optimizado y toda la configuracion de Claude Code con skills y
        agentes listos para que desarrolles con IA desde el primer minuto.
      </div>
    ),
  },
  {
    question: "Necesito saber programar?",
    answer: (
      <p>
        Necesitas conocimientos basicos de desarrollo web. El kit esta pensado
        para que con la ayuda de Claude Code puedas construir y lanzar tu
        producto sin ser un experto. La IA hace el trabajo pesado, tu pones
        la idea y la direccion.
      </p>
    ),
  },
  {
    question: "Puedo usarlo para cualquier tipo de proyecto?",
    answer: (
      <div className="space-y-2 leading-relaxed">
        Si. La plantilla esta preparada para SaaS, herramientas de IA, apps
        web, marketplaces o cualquier producto digital que necesite auth,
        pagos y una landing profesional.
      </div>
    ),
  },
];

// memo() evita re-renders innecesarios cuando otros items cambian de estado
const FaqItem = memo(({ item }: { item: FAQItemProps }) => {
  const accordion = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <li>
      <button
        className="relative flex gap-2 items-center w-full py-5 text-base font-semibold text-left border-t md:text-lg border-base-content/10"
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
        aria-expanded={isOpen}
      >
        <span
          className={`flex-1 text-base-content ${isOpen ? "text-primary" : ""}`}
        >
          {item?.question}
        </span>
        <svg
          className={`flex-shrink-0 w-4 h-4 ml-auto fill-current`}
          viewBox="0 0 16 16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            y="7"
            width="16"
            height="2"
            rx="1"
            className={`transform origin-center transition duration-200 ease-out ${
              isOpen && "rotate-180"
            }`}
          />
          <rect
            y="7"
            width="16"
            height="2"
            rx="1"
            className={`transform origin-center rotate-90 transition duration-200 ease-out ${
              isOpen && "rotate-180 hidden"
            }`}
          />
        </svg>
      </button>

      <div
        ref={accordion}
        className={`transition-all duration-300 ease-in-out opacity-80 overflow-hidden`}
        style={
          isOpen
            ? { maxHeight: accordion?.current?.scrollHeight, opacity: 1 }
            : { maxHeight: 0, opacity: 0 }
        }
      >
        <div className="pb-5 leading-relaxed">{item?.answer}</div>
      </div>
    </li>
  );
});

FaqItem.displayName = "FaqItem";

const FAQ = () => {
  return (
    <section className="bg-base-200" id="faq">
      <div className="py-24 px-8 max-w-7xl mx-auto flex flex-col md:flex-row gap-12">
        <div className="flex flex-col text-left basis-1/2">
          <p className="inline-block font-semibold text-primary mb-4">FAQ</p>
          <p className="sm:text-4xl text-3xl font-extrabold text-base-content">
            Preguntas Frecuentes
          </p>
        </div>

        <ul className="basis-1/2">
          {faqList.map((item, i) => (
            <FaqItem key={i} item={item} />
          ))}
        </ul>
      </div>
    </section>
  );
};

export default FAQ;
