import Link from "next/link";
import Image from "next/image";
import config from "@/config";
import logo from "@/app/icon.png";

// Footer minimo de la landing de validacion de Vega: solo marca y los
// enlaces legales -- sin soporte, precios ni blog heredados del
// boilerplate (ninguno existe hoy para Vega).
const Footer = () => {
  return (
    <footer className="bg-base-200 border-t border-base-content/10">
      <div className="max-w-7xl mx-auto px-8 py-16">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10">
          <div className="text-center md:text-left">
            <Link
              href="/"
              aria-current="page"
              className="flex gap-2 justify-center md:justify-start items-center"
            >
              <Image
                src={logo}
                alt={`Logo de ${config.appName}`}
                priority={true}
                className="w-6 h-6"
                width={24}
                height={24}
              />
              <strong className="font-extrabold tracking-tight text-base md:text-lg">
                {config.appName}
              </strong>
            </Link>

            <p className="mt-3 text-sm text-base-content/80">
              {config.appDescription}
            </p>
            <p className="mt-3 text-sm text-base-content/60">
              Copyright © {new Date().getFullYear()} - Todos los derechos
              reservados
            </p>
          </div>

          <div className="text-center md:text-left">
            <div className="footer-title font-semibold text-base-content tracking-widest text-sm mb-3">
              LEGAL
            </div>
            <div className="flex flex-col items-center md:items-start gap-2 text-sm">
              <Link href="/tos" className="link link-hover">
                Términos de servicio
              </Link>
              <Link href="/privacy-policy" className="link link-hover">
                Política de privacidad
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
