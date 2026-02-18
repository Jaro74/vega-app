# 09 - SEO

Configuracion de SEO, meta tags, sitemap y datos estructurados.

---

## Archivos Involucrados

| Archivo | Funcion |
|---------|---------|
| `libs/seo.tsx` | Funciones de generacion de meta tags y datos estructurados |
| `app/layout.tsx` | Aplica SEO tags globales |
| `next-sitemap.config.js` | Configuracion del sitemap |
| `app/opengraph-image.png` | Imagen para compartir en redes |
| `app/twitter-image.png` | Imagen para Twitter |
| `app/icon.png` | Favicon |
| `app/apple-icon.png` | Icono Apple |
| `app/favicon.ico` | Favicon ICO |

---

## Meta Tags (getSEOTags)

La funcion `getSEOTags()` genera todas las meta tags necesarias.

### Uso Global

En `app/layout.tsx`, se aplica a todas las paginas:

```typescript
export const metadata = getSEOTags();
```

### Uso por Pagina

Puedes personalizar los tags en cada pagina:

```typescript
// En cualquier page.tsx
import { getSEOTags } from "@/libs/seo";

export const metadata = getSEOTags({
  title: "Precios - MiApp",
  description: "Planes y precios de MiApp",
  canonicalUrlRelative: "/pricing",
});
```

### Parametros Disponibles

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `title` | string | `config.appName` | Titulo de la pagina (max 50 chars) |
| `description` | string | `config.appDescription` | Meta description (max 160 chars) |
| `keywords` | string[] | `[config.appName]` | Keywords separadas por comas |
| `openGraph` | object | Auto-generado | Tags OpenGraph personalizados |
| `canonicalUrlRelative` | string | - | URL canonica relativa (ej: "/pricing") |
| `extraTags` | object | - | Tags adicionales personalizados |

### Que Genera

- **title**: Titulo de la pagina
- **description**: Meta description
- **keywords**: Meta keywords
- **applicationName**: Nombre de la app
- **metadataBase**: URL base para meta tags
- **openGraph**: Titulo, descripcion, URL, siteName, locale, type
- **twitter**: Titulo, descripcion, card type ("summary_large_image")
- **alternates.canonical**: URL canonica (si se proporciona)

---

## Datos Estructurados (renderSchemaTags)

Los datos estructurados ayudan a Google a entender tu sitio y pueden generar rich snippets en los resultados de busqueda.

### Uso

```jsx
// En cualquier page.tsx (Server Component)
import { renderSchemaTags } from "@/libs/seo";

export default function Page() {
  return (
    <>
      {renderSchemaTags()}
      {/* resto del contenido */}
    </>
  );
}
```

### Que Genera

```json
{
  "@context": "http://schema.org",
  "@type": "SoftwareApplication",
  "name": "MiApp",
  "description": "Descripcion de MiApp",
  "image": "https://miapp.com/icon.png",
  "url": "https://miapp.com/",
  "author": {
    "@type": "Person",
    "name": "IA LAB"
  },
  "datePublished": "2024-01-01",
  "applicationCategory": "EducationalApplication",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "12"
  },
  "offers": [
    {
      "@type": "Offer",
      "price": "9.00",
      "priceCurrency": "USD"
    }
  ]
}
```

**Personalizar:** Edita `libs/seo.tsx` > `renderSchemaTags()` para cambiar el tipo, rating, precio, categoria, etc.

**Herramienta de verificacion:** [Google Rich Results Test](https://search.google.com/test/rich-results)

---

## Sitemap

### Configuracion

En `next-sitemap.config.js`:

```javascript
module.exports = {
  siteUrl: process.env.SITE_URL || "https://shipfa.st",
  generateRobotsTxt: true,
  exclude: ["/twitter-image.*", "/opengraph-image.*", "/icon.*"],
};
```

**Actualizar el `siteUrl`** con tu dominio de produccion.

### Generacion

El sitemap se genera automaticamente al hacer build:

```bash
npm run build  # Ejecuta 'next-sitemap' despues del build
```

Genera:
- `public/sitemap.xml` - Mapa del sitio
- `public/robots.txt` - Reglas para crawlers

---

## Imagenes Sociales

### OpenGraph (Facebook, LinkedIn, etc.)

Archivo: `app/opengraph-image.png`

Tamano recomendado: 1200x630 pixels

Se usa automaticamente cuando alguien comparte tu URL en redes sociales.

### Twitter Card

Archivo: `app/twitter-image.png`

Tamano recomendado: 1200x600 pixels

Se usa cuando alguien comparte tu URL en Twitter/X.

### Favicons

| Archivo | Uso |
|---------|-----|
| `app/favicon.ico` | Favicon para navegadores |
| `app/icon.png` | Favicon moderno (32x32) |
| `app/apple-icon.png` | Icono para dispositivos Apple |

---

## URL Canonica

Siempre establece una URL canonica para evitar contenido duplicado:

```typescript
export const metadata = getSEOTags({
  canonicalUrlRelative: "/",  // Para la landing
});

export const metadata = getSEOTags({
  canonicalUrlRelative: "/pricing",  // Para la pagina de precios
});
```

---

## Checklist SEO

- [ ] `appName` y `appDescription` actualizados en `config.ts`
- [ ] `domainName` correcto en `config.ts`
- [ ] Imagen `opengraph-image.png` personalizada
- [ ] Imagen `twitter-image.png` personalizada
- [ ] Favicons personalizados
- [ ] `siteUrl` actualizado en `next-sitemap.config.js`
- [ ] Datos estructurados actualizados en `libs/seo.tsx`
- [ ] URL canonica en cada pagina
- [ ] `<h1>` descriptivo en cada pagina
- [ ] Meta descriptions unicas por pagina
