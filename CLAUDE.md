# Plantilla SaaS - Next.js 15

Boilerplate de produccion para aplicaciones SaaS con autenticacion, pagos, email y 30+ componentes.

## Stack

- **Framework**: Next.js 15.1.9 (App Router) + React 19 + TypeScript 5.9.2
- **Estilos**: Tailwind CSS 4.1.10 + DaisyUI 5.0.5
- **Auth**: Supabase Auth (Google OAuth + Magic Links)
- **Base de datos**: Supabase (PostgreSQL)
- **Pagos**: Stripe (pagos unicos + suscripciones)
- **Email**: Resend
- **Soporte**: Crisp (chat en vivo)

## Comandos

```bash
npm run dev       # Desarrollo (http://localhost:3000)
npm run build     # Build produccion (genera sitemap)
npm run start     # Servidor produccion
npm run lint      # ESLint
```

## Estructura de Archivos

```
app/
  api/
    auth/callback/route.ts     # OAuth callback
    lead/route.ts              # Captura emails
    stripe/
      create-checkout/route.ts # Crea sesion de pago
      create-portal/route.ts   # Portal de facturacion
    webhook/stripe/route.ts    # Webhooks de Stripe
  dashboard/
    layout.tsx                 # Guard de autenticacion
    page.tsx                   # Pagina privada
  signin/page.tsx              # Login (Google + Magic Link)
  privacy-policy/page.tsx      # Politica privacidad
  tos/page.tsx                 # Terminos de servicio
  layout.tsx                   # Layout raiz (fuente, SEO, tema)
  page.tsx                     # Landing page
  globals.css                  # Tailwind + DaisyUI + animaciones

components/                    # 30+ componentes reutilizables
  Header.tsx                   # Navegacion responsive
  Footer.tsx                   # Pie de pagina
  Hero.tsx                     # Seccion hero
  Problem.tsx                  # Seccion problema
  FeaturesAccordion.tsx        # Features en acordeon
  FeaturesGrid.tsx             # Features en grid
  FeaturesListicle.tsx         # Features en lista
  Pricing.tsx                  # Tabla de precios
  FAQ.tsx                      # Preguntas frecuentes
  CTA.tsx                      # Llamada a la accion
  WithWithout.tsx              # Comparacion con/sin
  Testimonial*.tsx             # Testimonios (5 variantes)
  ButtonCheckout.tsx           # Pago con Stripe
  ButtonSignin.tsx             # Login
  ButtonAccount.tsx            # Menu cuenta (billing + logout)
  ButtonLead.tsx               # Captura emails
  ButtonGradient.tsx           # Boton gradiente animado
  ButtonPopover.tsx            # Menu popover
  ButtonSupport.tsx            # Abre chat Crisp
  Modal.tsx                    # Ventana emergente
  Tabs.tsx                     # Pestanas
  LayoutClient.tsx             # Wrappers cliente (toast, tooltip, crisp)

libs/
  supabase/
    client.ts                  # Cliente browser (sin await)
    server.ts                  # Cliente servidor (con await)
    middleware.ts              # Refresco de sesion
  api.ts                       # Cliente Axios (interceptores 401/403)
  stripe.ts                    # createCheckout, createCustomerPortal, findCheckoutSession
  resend.ts                    # sendEmail helper
  seo.tsx                      # getSEOTags, renderSchemaTags

types/
  config.ts                    # ConfigProps, Theme
  index.ts                     # Re-exports

config.ts                      # Configuracion central (nombre, planes, emails, tema, auth)
middleware.ts                  # Refresco de sesion auth en cada request
```

## Configuracion Central

Todo se configura en `config.ts`:
- `appName`, `appDescription`, `domainName` - Identidad
- `stripe.plans` - Planes de pago con priceId
- `resend` - Remitentes de email
- `colors.theme` - Tema DaisyUI activo
- `auth.callbackUrl` - Redireccion post-login

## Base de Datos

Tabla principal: `profiles`
- `id` (uuid, PK) - Referencia a auth.users
- `email` (text)
- `customer_id` (text) - ID Stripe
- `price_id` (text) - Plan activo
- `has_access` (boolean) - Acceso al producto

Trigger automatico crea perfil al registrarse.

## Patrones Importantes

### Next.js 15
- `await cookies()`, `await headers()`, `await params` (siempre con await)
- Server Components por defecto, `"use client"` solo cuando necesario
- `await createClient()` para Supabase en servidor

### Dos Clientes Supabase
- `libs/supabase/client.ts` -> Browser (sin await): `const supabase = createClient()`
- `libs/supabase/server.ts` -> Servidor (con await): `const supabase = await createClient()`

### Proteccion de Rutas
- `app/dashboard/layout.tsx` verifica auth y redirige si no esta logueado
- Cualquier pagina bajo `app/dashboard/` hereda la proteccion

### Flujo de Pagos
1. `ButtonCheckout` -> `POST /api/stripe/create-checkout` -> Stripe Checkout
2. Stripe webhook -> `POST /api/webhook/stripe` -> actualiza `profiles.has_access`

### Cliente API
- `libs/api.ts` - Axios con interceptores
- 401 -> redirige a login
- 403 -> muestra "Elige un plan"
- Errores -> toast automatico

### Cuando Usar Cada Patron

**Server Components:** obtener datos de DB/API, verificar auth, generar metadata, contenido estatico.

**Client Components (`"use client"`):** interacciones de usuario, estado local, APIs del navegador, tiempo real.

**API Routes:** envios de formularios, webhooks, operaciones servidor, mutaciones de DB.

## Variables de Entorno

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
```

## Documentacion Extendida

Ver `documentacion/INDEX.md` para guias detalladas de:
- Setup inicial y primer arranque
- Arquitectura y flujo de datos
- Configuracion completa de config.ts
- Autenticacion (Google OAuth + Magic Links)
- Pagos con Stripe (checkout, webhooks, portal)
- Base de datos (tabla profiles, RLS, clientes)
- Todas las rutas API (parametros, respuestas)
- Estilos, temas y animaciones (Tailwind v4 + DaisyUI v5)
- SEO y datos estructurados
- Email con Resend
- Catalogo de 30+ componentes con ejemplos

## Reglas de Codigo

- No emojis en codigo ni comentarios
- Inmutabilidad: nunca mutar objetos ni arrays
- Muchos archivos pequenos (200-400 lineas, max 800)
- TypeScript estricto con `noImplicitAny`
- Validar inputs con Zod
- No hardcodear secretos
- Server Components por defecto
- Commits convencionales: feat:, fix:, refactor:, docs:, test:
- Aplicar best practices de Next.js (ver skills/vercel-next-best-practices)

## Errores Comunes de Build

1. Falta de `await` en APIs asincronas de Next.js 15
2. Tipado incorrecto de `params` en rutas dinamicas
3. Problemas de limites entre componentes Cliente/Servidor
4. Variables de entorno faltantes
5. Errores de configuracion de Tailwind CSS

## Testing

```bash
npm run build     # Verificar que el build pasa
```

- TDD: escribir tests primero
- 80% cobertura minima
- Unit tests para utilidades
- Integration tests para APIs
- E2E para flujos criticos

## Git

- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`
- No commitear a main directamente
- PRs requieren review
- Todos los tests deben pasar antes de merge
