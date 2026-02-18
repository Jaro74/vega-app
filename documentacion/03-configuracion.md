# 03 - Configuracion

Referencia completa del archivo `config.ts`, el centro de configuracion de toda la app.

---

## Ubicacion

```
config.ts        # Archivo de configuracion
types/config.ts  # Tipos TypeScript
```

---

## Estructura Completa

```typescript
const config = {
  // --- IDENTIDAD ---
  appName: string,          // Nombre de la app (usado en SEO, emails, UI)
  appDescription: string,   // Descripcion corta (SEO meta description)
  domainName: string,       // Dominio sin https:// ni / final

  // --- SOPORTE ---
  crisp: {
    id: string,                    // ID del sitio en Crisp (dejar vacio si no se usa)
    onlyShowOnRoutes: string[],    // Rutas donde mostrar el chat (ej: ["/"])
  },

  // --- PAGOS ---
  stripe: {
    plans: [
      {
        priceId: string,          // ID del precio en Stripe (price_...)
        name: string,             // Nombre del plan
        description?: string,     // Descripcion del plan
        price: number,            // Precio a mostrar
        priceAnchor?: number,     // Precio tachado (antes costaba X)
        isFeatured?: boolean,     // Destacar este plan (solo uno)
        features: [
          { name: string },       // Lista de caracteristicas
        ],
      },
    ],
  },

  // --- ALMACENAMIENTO (opcional) ---
  aws?: {
    bucket: string,       // Nombre del bucket S3
    bucketUrl: string,    // URL del bucket
    cdn: string,          // URL de CloudFront
  },

  // --- EMAIL ---
  resend: {
    fromNoReply: string,     // Remitente para magic links
    fromAdmin: string,       // Remitente para emails administrativos
    supportEmail?: string,   // Email de soporte (alternativa a Crisp)
  },

  // --- VISUAL ---
  colors: {
    theme: Theme,    // Tema DaisyUI activo
    main: string,    // Color principal HEX (barra del navegador, etc.)
  },

  // --- AUTH ---
  auth: {
    loginUrl: string,      // Ruta de login (por defecto "/api/auth/signin")
    callbackUrl: string,   // Ruta post-login (por defecto "/dashboard")
  },
};
```

---

## Campos Detallados

### appName

Nombre de la aplicacion. Se usa en:
- Titulo de paginas (SEO)
- Header y Footer
- Emails
- Datos estructurados de Google

```typescript
appName: "MiApp",
```

### appDescription

Descripcion corta para la meta tag `description`. Maximo 160 caracteres recomendados.

```typescript
appDescription: "Automatiza tu flujo de trabajo con IA",
```

### domainName

Dominio de produccion. Sin protocolo, sin barra final.

```typescript
domainName: "miapp.com",  // correcto
// NO: "https://miapp.com/"
```

Se usa en: URLs canonicas, meta tags OG, datos estructurados, generacion de sitemap.

### crisp

Chat de soporte en vivo.

- Si **usas Crisp**: pon tu ID y las rutas donde quieres mostrarlo
- Si **no usas Crisp**: deja `id: ""` y configura `resend.supportEmail` con un email de soporte

```typescript
crisp: {
  id: "tu-crisp-id",
  onlyShowOnRoutes: ["/"],  // solo en la landing
},
```

### stripe.plans

Array de planes de pago. Cada plan necesita un `priceId` de Stripe.

```typescript
stripe: {
  plans: [
    {
      priceId:
        process.env.NODE_ENV === "development"
          ? "price_test_xxx"   // ID de test
          : "price_live_xxx",  // ID de produccion
      name: "Pro",
      description: "Para profesionales",
      price: 49,
      priceAnchor: 79,       // Muestra "$79" tachado
      isFeatured: true,       // Resalta este plan
      features: [
        { name: "Todo lo basico" },
        { name: "Soporte prioritario" },
        { name: "Actualizaciones de por vida" },
      ],
    },
  ],
},
```

### resend

Configuracion de emails. Los dominios deben estar verificados en Resend.

```typescript
resend: {
  fromNoReply: "MiApp <noreply@miapp.com>",   // Magic links
  fromAdmin: "Ana de MiApp <ana@miapp.com>",    // Emails admin
  supportEmail: "soporte@miapp.com",             // Email de soporte
},
```

### colors

```typescript
colors: {
  theme: "light",       // Tema DaisyUI
  main: "#3b82f6",      // Color HEX para barra del navegador
},
```

### auth

```typescript
auth: {
  loginUrl: "/api/auth/signin",   // A donde redirigir para login
  callbackUrl: "/dashboard",       // A donde ir despues de login exitoso
},
```

---

## Tipo Theme

Temas DaisyUI disponibles:

```
light, dark, cupcake, bumblebee, emerald, corporate,
synthwave, retro, cyberpunk, valentine, halloween, garden,
forest, aqua, lofi, pastel, fantasy, wireframe, black,
luxury, dracula, saveit
```

Tambien puedes dejar `""` para usar el tema por defecto del sistema.

---

## Donde Se Usa config.ts

| Archivo | Que lee de config |
|---------|-------------------|
| `app/layout.tsx` | `colors.theme`, `colors.main`, SEO tags |
| `app/page.tsx` | Indirectamente via componentes |
| `app/signin/page.tsx` | `appName`, `colors.theme` |
| `components/Header.tsx` | `appName` |
| `components/Pricing.tsx` | `stripe.plans` |
| `components/ButtonCheckout.tsx` | `stripe.plans` |
| `components/ButtonSignin.tsx` | `auth.callbackUrl` |
| `components/LayoutClient.tsx` | `crisp` |
| `libs/api.ts` | `auth.loginUrl` |
| `libs/seo.tsx` | `appName`, `appDescription`, `domainName` |
| `libs/resend.ts` | `resend.fromAdmin` |
| `app/api/auth/callback` | `auth.callbackUrl` |
| `app/api/webhook/stripe` | `stripe.plans` |
