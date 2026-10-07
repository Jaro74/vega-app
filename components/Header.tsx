import Link from "next/link";
import Image from "next/image";
import logo from "@/app/icon.png";
import config from "@/config";

// Header minimo de la landing de validacion de Vega: solo marca y un CTA
// hacia /explorar -- sin enlaces de producto/pricing ni login, que no
// existen en esta landing (ver app/page.tsx).
const Header = () => {
  return (
    <header className="bg-base-200">
      <nav
        className="container flex items-center justify-between px-8 py-4 mx-auto"
        aria-label="Global"
      >
        <Link
          className="flex items-center gap-2 shrink-0"
          href="/"
          title={`Inicio de ${config.appName}`}
        >
          <Image
            src={logo}
            alt={`Logo de ${config.appName}`}
            className="w-8"
            placeholder="blur"
            priority={true}
            width={32}
            height={32}
          />
          <span className="font-extrabold text-lg">{config.appName}</span>
        </Link>

        <Link href="/explorar" className="btn btn-primary btn-sm sm:btn-md normal-case">
          Explorar con Vega
        </Link>
      </nav>
    </header>
  );
};

export default Header;
