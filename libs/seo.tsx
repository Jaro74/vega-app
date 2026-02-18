import type { Metadata } from "next";
import config from "@/config";

// Estas son todas las etiquetas SEO que puedes agregar a tus paginas.
// Prerellena datos con titulo/descripcion/OG predeterminados, etc. y puedes personalizarlo para cada pagina.
// Ya esta agregado en el root layout.js asi que no tienes que agregarlo a cada pagina
// Pero recomiendo establecer la URL canonica para cada pagina (export const metadata = getSEOTags({canonicalUrlRelative: "/"});)
export const getSEOTags = ({
  title,
  description,
  keywords,
  openGraph,
  canonicalUrlRelative,
  extraTags,
}: Metadata & {
  canonicalUrlRelative?: string;
  extraTags?: Record<string, any>;
} = {}) => {
  return {
    // hasta 50 caracteres (que hace tu app para el usuario?) > tu keyword principal deberia estar aqui
    title: title || config.appName,
    // hasta 160 caracteres (como ayuda tu app al usuario?)
    description: description || config.appDescription,
    // algunas palabras clave separadas por comas. por defecto sera el nombre de tu app
    keywords: keywords || [config.appName],
    applicationName: config.appName,
    // establece un prefijo de URL base para otros campos que requieren una URL completa (ej. og:image: 'https://tudominio.com/share.png' => '/share.png')
    metadataBase: new URL(
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000/"
        : `https://${config.domainName}/`
    ),

    openGraph: {
      title: openGraph?.title || config.appName,
      description: openGraph?.description || config.appDescription,
      url: openGraph?.url || `https://${config.domainName}/`,
      siteName: openGraph?.title || config.appName,
      // Si agregas una imagen opengraph-image.(jpg|jpeg|png|gif) a la carpeta /app, no necesitas el codigo de abajo
      // images: [
      //   {
      //     url: `https://${config.domainName}/share.png`,
      //     width: 1200,
      //     height: 660,
      //   },
      // ],
      locale: "es_ES",
      type: "website",
    },

    twitter: {
      title: openGraph?.title || config.appName,
      description: openGraph?.description || config.appDescription,
      // Si agregas una imagen twitter-image.(jpg|jpeg|png|gif) a la carpeta /app, no necesitas el codigo de abajo
      // images: [openGraph?.image || defaults.og.image],
      card: "summary_large_image",
      creator: "@tu_usuario",
    },

    // Si se proporciona una URL canonica, la agregamos. metadataBase convertira la URL relativa en una URL completa
    ...(canonicalUrlRelative && {
      alternates: { canonical: canonicalUrlRelative },
    }),

    // Si quieres agregar etiquetas extra, puedes pasarlas aqui
    ...extraTags,
  };
};

// Datos Estructurados para Resultados Enriquecidos en Google. Mas info: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
// Encuentra tu tipo aqui (SoftwareApp, Book...): https://developers.google.com/search/docs/appearance/structured-data/search-gallery
// Usa esta herramienta para verificar que los datos estan bien estructurados: https://search.google.com/test/rich-results
// No tienes que usar este componente, pero aumenta tus posibilidades de tener un rich snippet en Google.
// Recomiendo el de abajo para tu /page.js para apps de software: Le dice a Google que tu AppName es un Software, y tiene una calificacion de 4.8/5 de 12 resenas.
// Rellena los campos con tus propios datos
export const renderSchemaTags = () => {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "http://schema.org",
          "@type": "SoftwareApplication",
          name: config.appName,
          description: config.appDescription,
          image: `https://${config.domainName}/icon.png`,
          url: `https://${config.domainName}/`,
          author: {
            "@type": "Person",
            name: "IA LAB",
          },
          datePublished: "2024-01-01",
          applicationCategory: "EducationalApplication",
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.8",
            ratingCount: "12",
          },
          offers: [
            {
              "@type": "Offer",
              price: "9.00",
              priceCurrency: "USD",
            },
          ],
        }),
      }}
    ></script>
  );
};
