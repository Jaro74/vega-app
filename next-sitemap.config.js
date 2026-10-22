// SITE_URL es la unica fuente de verdad del dominio publico (misma
// variable que usa libs/seo.tsx) -- sin ningun valor por defecto. Generar
// un sitemap/robots con un dominio incorrecto es peor que fallar aqui.
if (!process.env.SITE_URL) {
  throw new Error(
    "SITE_URL no esta configurado. Define SITE_URL (en Vercel, o en .env.local para generar un sitemap de prueba) con el dominio publico real de Vega antes de ejecutar 'npm run build' -- no hay ningun dominio por defecto seguro."
  );
}

module.exports = {
  siteUrl: process.env.SITE_URL,
  generateRobotsTxt: true,
  // use this to exclude routes from the sitemap (i.e. a user dashboard). By default, NextJS app router metadata files are excluded (https://nextjs.org/docs/app/api-reference/file-conventions/metadata)
  // /explorar y /flow excluidas mientras el trafico real del experimento
  // Vega este suspendido y no exista responsable del tratamiento
  // identificado -- se retiran de esta lista cuando se reactive el
  // trafico real (ver tambien app/explorar/layout.tsx y app/flow/layout.tsx).
  exclude: ["/twitter-image.*", "/opengraph-image.*", "/icon.*", "/explorar", "/flow"],
};
