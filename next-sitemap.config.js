module.exports = {
  // REQUIRED: add your own domain name here (e.g. https://shipfa.st),
  siteUrl: process.env.SITE_URL || "https://shipfa.st",
  generateRobotsTxt: true,
  // use this to exclude routes from the sitemap (i.e. a user dashboard). By default, NextJS app router metadata files are excluded (https://nextjs.org/docs/app/api-reference/file-conventions/metadata)
  // /explorar y /flow excluidas mientras el trafico real del experimento
  // Vega este suspendido y no exista responsable del tratamiento
  // identificado -- se retiran de esta lista cuando se reactive el
  // trafico real (ver tambien app/explorar/layout.tsx y app/flow/layout.tsx).
  exclude: ["/twitter-image.*", "/opengraph-image.*", "/icon.*", "/explorar", "/flow"],
};
