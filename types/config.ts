export type Theme =
  | "light"
  | "dark"
  | "cupcake"
  | "bumblebee"
  | "emerald"
  | "corporate"
  | "synthwave"
  | "retro"
  | "cyberpunk"
  | "valentine"
  | "halloween"
  | "garden"
  | "forest"
  | "aqua"
  | "lofi"
  | "pastel"
  | "fantasy"
  | "wireframe"
  | "black"
  | "luxury"
  | "dracula"
  | "saveit"
  | "";

export interface ConfigProps {
  appName: string;
  appDescription: string;
  // No hay domainName aqui: "ialab.dev" era heredado de la plantilla, no
  // el dominio de Vega. La URL publica depende de la variable de entorno
  // SITE_URL (unica fuente, leida en libs/seo.tsx y next-sitemap.config.js),
  // nunca de un valor fijo en este archivo.
  crisp: {
    id?: string;
    onlyShowOnRoutes?: string[];
  };
  stripe: {
    plans: {
      isFeatured?: boolean;
      priceId: string;
      name: string;
      description?: string;
      price: number;
      priceAnchor?: number;
      features: {
        name: string;
      }[];
    }[];
  };
  aws?: {
    bucket?: string;
    bucketUrl?: string;
    cdn?: string;
  };
  resend: {
    // Opcionales a proposito: Vega todavia no tiene una identidad de envio
    // propia (ver config.ts) -- sendEmail() en libs/resend.ts exige estos
    // valores en tiempo de llamada, no aqui, para no forzar un remitente
    // heredado del boilerplate ni uno inventado.
    fromNoReply?: string;
    fromAdmin?: string;
    supportEmail?: string;
  };
  colors: {
    theme: Theme;
    main: string;
  };
  auth: {
    loginUrl: string;
    callbackUrl: string;
  };
}
