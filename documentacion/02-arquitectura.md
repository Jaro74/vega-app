# 02 - Arquitectura

Vision completa de la estructura del proyecto, patrones de diseno y flujo de datos.

---

## Estructura de Archivos

```
plantilla-proyectos/
|
|-- app/                          # Next.js App Router
|   |-- api/                      # Rutas API (server-side)
|   |   |-- auth/callback/        # OAuth callback
|   |   |-- lead/                 # Captura de emails
|   |   |-- stripe/               # Checkout y portal
|   |   |-- webhook/stripe/       # Webhooks de Stripe
|   |
|   |-- dashboard/                # Paginas privadas (requiere auth)
|   |   |-- layout.tsx            # Guard de autenticacion
|   |   |-- page.tsx              # Pagina del dashboard
|   |
|   |-- signin/                   # Pagina de login
|   |-- privacy-policy/           # Politica de privacidad
|   |-- tos/                      # Terminos de servicio
|   |
|   |-- layout.tsx                # Layout raiz (fuente, SEO, tema)
|   |-- page.tsx                  # Landing page
|   |-- globals.css               # Tailwind + DaisyUI + animaciones
|   |-- error.tsx                 # Error boundary global
|   |-- not-found.tsx             # Pagina 404
|   |-- favicon.ico               # Favicon
|   |-- icon.png                  # Icono
|   |-- apple-icon.png            # Icono Apple
|   |-- opengraph-image.png       # Imagen para redes sociales
|   |-- twitter-image.png         # Imagen para Twitter
|
|-- components/                   # Componentes React reutilizables
|   |-- Header.tsx                # Navegacion principal
|   |-- Footer.tsx                # Pie de pagina
|   |-- Hero.tsx                  # Seccion hero
|   |-- Problem.tsx               # Seccion problema
|   |-- FeaturesAccordion.tsx     # Features en acordeon
|   |-- FeaturesGrid.tsx          # Features en grid
|   |-- FeaturesListicle.tsx      # Features en lista
|   |-- Pricing.tsx               # Tabla de precios
|   |-- FAQ.tsx                   # Preguntas frecuentes
|   |-- CTA.tsx                   # Llamada a la accion
|   |-- Testimonials*.tsx         # Variaciones de testimonios (5)
|   |-- Button*.tsx               # Variaciones de botones (6)
|   |-- Modal.tsx                 # Ventana emergente
|   |-- Tabs.tsx                  # Pestanas
|   |-- LayoutClient.tsx          # Wrappers del lado cliente
|   |-- ...                       # Mas componentes
|
|-- libs/                         # Librerias y utilidades
|   |-- supabase/
|   |   |-- client.ts             # Cliente Supabase para el browser
|   |   |-- server.ts             # Cliente Supabase para el servidor
|   |   |-- middleware.ts         # Refresco de sesion
|   |-- api.ts                    # Cliente Axios con interceptores
|   |-- stripe.ts                 # Funciones de Stripe
|   |-- resend.ts                 # Funcion de envio de email
|   |-- seo.tsx                   # Utilidades SEO
|
|-- types/                        # Definiciones TypeScript
|   |-- config.ts                 # Tipos de configuracion
|   |-- index.ts                  # Re-exportaciones
|
|-- documentacion/                # Esta documentacion
|
|-- config.ts                     # Configuracion central de la app
|-- middleware.ts                  # Middleware de Next.js (auth)
|-- next.config.js                # Configuracion de Next.js
|-- next-sitemap.config.js        # Configuracion del sitemap
|-- postcss.config.js             # Configuracion PostCSS
|-- tsconfig.json                 # Configuracion TypeScript
|-- package.json                  # Dependencias y scripts
```

---

## Patron de Componentes

### Server Components (por defecto)

Next.js 15 usa Server Components por defecto. Se usan para:
- Obtener datos de base de datos o APIs
- Verificar autenticacion
- Generar metadata SEO
- Renderizar contenido estatico

Ejemplo: `app/dashboard/page.tsx`, `app/dashboard/layout.tsx`

### Client Components ("use client")

Se usan solo cuando se necesita:
- Interaccion del usuario (clics, formularios, hover)
- Estado local (`useState`, `useEffect`)
- APIs del navegador (localStorage, window)
- Librerias que requieren el DOM

Ejemplo: `app/signin/page.tsx`, `components/ButtonCheckout.tsx`

### Regla de Oro

> Manten los componentes como Server Components a menos que necesites interactividad. Si un componente necesita interactividad, extrae solo la parte interactiva a un Client Component.

---

## Flujo de Datos

### Autenticacion

```
Usuario -> /signin -> Google OAuth o Magic Link
                          |
                    Supabase Auth
                          |
                    /api/auth/callback
                          |
                    Intercambia codigo por sesion
                          |
                    Redirige a /dashboard
```

### Pagos

```
Usuario -> ButtonCheckout -> /api/stripe/create-checkout
                                      |
                                Stripe Checkout (pagina externa)
                                      |
                                Pago completado
                                      |
                          Stripe Webhook -> /api/webhook/stripe
                                      |
                          Actualiza profiles.has_access = true
```

### Proteccion de Rutas

```
Peticion HTTP -> middleware.ts
                     |
               updateSession() (refresca token auth)
                     |
               app/dashboard/layout.tsx
                     |
               supabase.auth.getUser()
                     |
         Usuario existe? -> Si -> Renderiza dashboard
                     |
                    No -> Redirige a /signin
```

### Captura de Leads

```
Usuario -> ButtonLead (introduce email)
                  |
            /api/lead (POST)
                  |
        (Guardar en BD / Enviar email de bienvenida)
```

---

## Patrones Clave

### Configuracion Centralizada

Todo lo configurable esta en un solo archivo: `config.ts`. Los componentes leen de aqui. Nunca hay valores hardcodeados dispersos por el proyecto.

```typescript
import config from "@/config";

// Usar en cualquier parte
config.appName          // "MiApp"
config.stripe.plans     // Array de planes
config.auth.callbackUrl // "/dashboard"
```

### Cliente API con Interceptores

`libs/api.ts` es un cliente Axios preconfigurado que:
- Usa `/api` como base URL
- Maneja automaticamente errores 401 (redirige a login)
- Maneja automaticamente errores 403 (muestra "Elige un plan")
- Muestra toasts de error automaticamente

```typescript
import apiClient from "@/libs/api";

// Uso desde componentes client
const { data } = await apiClient.post("/stripe/create-checkout", { priceId });
```

### Dos Clientes de Supabase

La plantilla tiene dos clientes de Supabase separados:

| Cliente | Archivo | Uso |
|---------|---------|-----|
| Browser | `libs/supabase/client.ts` | Componentes `"use client"` |
| Server | `libs/supabase/server.ts` | Server Components y API Routes |

```typescript
// En un Server Component o API Route
import { createClient } from "@/libs/supabase/server";
const supabase = await createClient();

// En un Client Component
import { createClient } from "@/libs/supabase/client";
const supabase = createClient(); // sin await
```

### Middleware de Sesion

`middleware.ts` se ejecuta en cada request (excepto archivos estaticos). Su unica funcion es refrescar el token de autenticacion de Supabase para que la sesion no expire.

---

## Dependencias Principales

### Produccion

| Paquete | Uso |
|---------|-----|
| `next` | Framework React con SSR, routing, API routes |
| `react` / `react-dom` | Libreria UI |
| `@supabase/ssr` + `@supabase/supabase-js` | Auth y base de datos |
| `stripe` | Pagos y suscripciones |
| `resend` | Envio de emails |
| `axios` | Cliente HTTP para API interna |
| `zod` | Validacion de esquemas |
| `@headlessui/react` | Componentes UI accesibles (Dialog, Popover) |
| `react-hot-toast` | Notificaciones toast |
| `react-tooltip` | Tooltips |
| `crisp-sdk-web` | Chat de soporte |
| `nextjs-toploader` | Barra de progreso superior |
| `@mdx-js/loader` + `@mdx-js/react` + `@next/mdx` | Soporte MDX para blog |
| `next-sitemap` | Generacion automatica de sitemap |

### Desarrollo

| Paquete | Uso |
|---------|-----|
| `tailwindcss` | Framework CSS utility-first |
| `@tailwindcss/postcss` | Plugin PostCSS para Tailwind v4 |
| `daisyui` | Componentes UI con temas |
| `typescript` | Tipado estatico |
| `@types/*` | Tipos para librerias |
