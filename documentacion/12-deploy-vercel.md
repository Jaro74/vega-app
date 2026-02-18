# 12 - Deploy en Vercel

Guia para desplegar la plantilla en produccion con Vercel.

---

## Por Que Vercel

- Creadores de Next.js (soporte nativo)
- Deploy automatico desde GitHub
- HTTPS gratuito
- CDN global
- Previews por cada PR
- Plan gratuito generoso (suficiente para empezar)

---

## Requisitos Previos

- Cuenta en [Vercel](https://vercel.com) (gratis)
- Repositorio en GitHub con tu proyecto
- Variables de entorno listas (ver `.env.example`)
- Cuenta de Stripe con productos creados en modo live
- Dominio de Supabase configurado con URLs de produccion
- Dominio de Resend verificado

---

## Paso 1: Conectar Repositorio

1. Ve a [vercel.com/new](https://vercel.com/new)
2. Importa tu repositorio de GitHub
3. Vercel detecta automaticamente que es un proyecto Next.js
4. No cambies los ajustes de build (los valores por defecto son correctos):
   - **Framework Preset**: Next.js
   - **Build Command**: `next build`
   - **Output Directory**: `.next`

---

## Paso 2: Variables de Entorno

En la pantalla de configuracion del proyecto, agrega todas las variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
SITE_URL=https://tudominio.com
```

**Importante:**
- Usa las keys de **produccion** de Stripe (`sk_live_...`), no las de test
- El `STRIPE_WEBHOOK_SECRET` sera diferente al de desarrollo (lo configuras en el Paso 4)
- `SITE_URL` es tu dominio final (usado para sitemap y meta tags)

---

## Paso 3: Deploy

Haz clic en **Deploy**. Vercel:

1. Clona tu repositorio
2. Instala dependencias (`npm install`)
3. Ejecuta el build (`next build`)
4. Genera el sitemap (`next-sitemap` via `postbuild`)
5. Despliega en su CDN global

El primer deploy tarda 1-3 minutos. Obtendras una URL tipo `tu-proyecto.vercel.app`.

---

## Paso 4: Configurar Stripe Webhook de Produccion

1. Ve a [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. Haz clic en **Add endpoint**
3. URL del endpoint:
   ```
   https://tudominio.com/api/webhook/stripe
   ```
4. Selecciona estos eventos:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Haz clic en **Add endpoint**
6. Copia el **Signing secret** (`whsec_...`)
7. Ve a Vercel > tu proyecto > Settings > Environment Variables
8. Actualiza `STRIPE_WEBHOOK_SECRET` con el nuevo valor
9. Redeploy: ve a Deployments > menu (...) del ultimo deploy > Redeploy

---

## Paso 5: Configurar Dominio Personalizado

### En Vercel

1. Ve a tu proyecto > Settings > Domains
2. Agrega tu dominio (ej: `tudominio.com`)
3. Vercel te dara los registros DNS necesarios

### En tu Proveedor DNS

Agrega los registros que Vercel indica. Tipicamente:

| Tipo | Nombre | Valor |
|------|--------|-------|
| A | @ | `76.76.21.21` |
| CNAME | www | `cname.vercel-dns.com` |

La propagacion DNS tarda entre 5 minutos y 48 horas.

### HTTPS

Vercel genera automaticamente un certificado SSL. No necesitas hacer nada.

---

## Paso 6: Actualizar URLs en Servicios Externos

### Supabase

Ve a Authentication > URL Configuration:

- **Site URL**: `https://tudominio.com`
- **Redirect URLs**: agregar `https://tudominio.com/api/auth/callback`

Si usas Google OAuth, ve a Authentication > Providers > Google y asegurate de que la Redirect URL de Supabase esta configurada en Google Cloud Console.

### Resend

Si usas un dominio personalizado como remitente (ej: `noreply@tudominio.com`):

1. Ve a [resend.com/domains](https://resend.com/domains)
2. Verifica que tu dominio esta activo
3. Los registros DNS (SPF, DKIM) deben estar configurados

### Google Cloud Console (para OAuth)

1. Ve a APIs & Services > Credentials
2. En tu OAuth Client ID, agrega las URIs autorizadas:
   - **Authorized JavaScript origins**: `https://tudominio.com`
   - **Authorized redirect URIs**: la URL que te da Supabase

### config.ts

Actualiza:

```typescript
domainName: "tudominio.com",
```

### next-sitemap.config.js

Actualiza (o usa `SITE_URL`):

```javascript
siteUrl: process.env.SITE_URL || "https://tudominio.com",
```

---

## Paso 7: Verificar Todo

Despues del deploy, verifica:

- [ ] La landing page carga correctamente
- [ ] El login con Google funciona
- [ ] El login con Magic Link funciona y el email llega
- [ ] La pagina `/dashboard` redirige a login si no estas autenticado
- [ ] El boton de checkout abre Stripe en modo live
- [ ] Un pago de prueba (con tarjeta real o test de Stripe) actualiza `has_access`
- [ ] El portal de facturacion (Billing) funciona
- [ ] Los emails se envian correctamente
- [ ] Las imagenes OG se muestran al compartir en redes
- [ ] El sitemap es accesible en `https://tudominio.com/sitemap.xml`
- [ ] `https://tudominio.com/robots.txt` existe
- [ ] Las paginas legales (`/privacy-policy`, `/tos`) cargan

---

## Deploys Automaticos

Una vez conectado a GitHub, Vercel despliega automaticamente:

- **Push a `main`**: Deploy a produccion
- **Push a otra rama / PR**: Deploy de preview con URL unica

No necesitas hacer nada manual despues del setup inicial.

---

## Logs y Debugging

### Ver Logs en Vercel

1. Ve a tu proyecto > Deployments
2. Haz clic en un deploy
3. Ve a la pestana **Functions** para ver logs de API routes
4. O usa **Runtime Logs** para ver logs en tiempo real

### Errores Comunes

**Build falla: "Module not found"**
- Verifica que todas las dependencias estan en `package.json`
- Ejecuta `npm install` localmente para confirmar

**Error 500 en API routes**
- Revisa que todas las variables de entorno estan configuradas en Vercel
- Verifica los logs en Vercel > Functions

**Stripe webhook falla**
- Verifica que `STRIPE_WEBHOOK_SECRET` es el de produccion (no el de `stripe listen`)
- Verifica que la URL del endpoint es correcta
- Ve a Stripe Dashboard > Webhooks > tu endpoint > "Attempted events" para ver errores

**Login con Google no funciona**
- Verifica las Redirect URLs en Supabase y Google Cloud Console
- Asegurate de que el dominio esta autorizado en ambos

**Emails no llegan**
- Verifica que `RESEND_API_KEY` esta configurada
- Verifica que el dominio esta verificado en Resend
- Revisa los logs en [resend.com/emails](https://resend.com/emails)

---

## Variables de Entorno por Ambiente

Vercel permite tener variables diferentes por ambiente:

| Ambiente | Cuando se usa |
|----------|---------------|
| **Production** | Deploy desde `main` |
| **Preview** | Deploy desde PRs y ramas |
| **Development** | `vercel dev` en local |

Puedes configurar `STRIPE_SECRET_KEY` con la key de test para Preview y la key live para Production. Hazlo en Settings > Environment Variables > selecciona el ambiente para cada variable.
