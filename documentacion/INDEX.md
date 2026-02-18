# Documentacion de la Plantilla

Guia completa de todo lo que incluye esta plantilla SaaS. Usa este indice para navegar a cualquier seccion.

---

## Indice de Documentacion

| # | Documento | Descripcion |
|---|-----------|-------------|
| 1 | [Empezar](./01-empezar.md) | Instalacion, variables de entorno, primer arranque |
| 2 | [Arquitectura](./02-arquitectura.md) | Estructura de archivos, patrones, flujo de datos |
| 3 | [Configuracion](./03-configuracion.md) | Referencia completa de `config.ts` y tipos |
| 4 | [Autenticacion](./04-autenticacion.md) | Supabase Auth, Google OAuth, Magic Links |
| 5 | [Pagos con Stripe](./05-pagos-stripe.md) | Checkout, suscripciones, webhooks, portal |
| 6 | [Base de Datos](./06-base-de-datos.md) | Supabase, tabla profiles, cliente server/browser |
| 7 | [Rutas API](./07-api-routes.md) | Todos los endpoints, parametros, respuestas |
| 8 | [Componentes](./componentes-disponibles.md) | Catalogo de 30+ componentes con ejemplos |
| 9 | [Estilos y Temas](./08-estilos-temas.md) | Tailwind v4, DaisyUI v5, animaciones, temas |
| 10 | [SEO](./09-seo.md) | Meta tags, sitemap, datos estructurados |
| 11 | [Email](./10-email.md) | Resend, envio de correos, configuracion |
| 12 | [Paginas Legales](./11-paginas-legales.md) | Politica de privacidad, terminos de servicio, RGPD |
| 13 | [Deploy en Vercel](./12-deploy-vercel.md) | Deploy, dominio, webhook produccion, debugging |

---

## Stack Tecnologico

| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| Next.js | 15.1.9 | Framework React (App Router) |
| React | 19.0.0 | Libreria UI |
| TypeScript | 5.9.2 | Tipado estatico |
| Tailwind CSS | 4.1.10 | Estilos utility-first |
| DaisyUI | 5.0.5 | Componentes UI sobre Tailwind |
| Supabase | 2.45.0 | Auth + Base de datos PostgreSQL |
| Stripe | 13.11.0 | Pagos y suscripciones |
| Resend | 4.0.1 | Envio de emails transaccionales |
| Axios | 1.7.9 | Cliente HTTP para API interna |
| Zod | 3.24.1 | Validacion de datos |
| Crisp | 1.0.25 | Chat de soporte al cliente |
| MDX | 3.1.0 | Contenido con componentes React |

---

## Comandos Principales

```bash
# Desarrollo
npm run dev        # Servidor de desarrollo en http://localhost:3000

# Produccion
npm run build      # Build de produccion (genera sitemap automaticamente)
npm run start      # Servidor de produccion

# Calidad
npm run lint       # ESLint
```

---

## Que Incluye la Plantilla

### Listo para usar
- Landing page completa con secciones modulares
- Autenticacion con Google OAuth y Magic Links
- Pagos con Stripe (pagos unicos y suscripciones)
- Webhooks de Stripe para gestionar acceso
- Dashboard privado protegido por autenticacion
- Envio de emails con Resend
- Chat de soporte con Crisp
- SEO optimizado con meta tags y sitemap
- 30+ componentes reutilizables
- Temas personalizables con DaisyUI

### Arquitectura
- Next.js 15 App Router con Server Components
- TypeScript en todo el proyecto
- Tailwind CSS v4 con configuracion CSS-first
- Patron inmutable (sin mutaciones de objetos/arrays)
- Separacion clara server/client components
- API routes con validacion
- Middleware para sesiones de autenticacion
