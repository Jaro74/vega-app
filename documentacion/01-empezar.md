# 01 - Empezar

Guia paso a paso para configurar y arrancar la plantilla desde cero.

---

## Requisitos Previos

- Node.js 18+ instalado
- Cuenta en [Supabase](https://supabase.com) (gratis)
- Cuenta en [Stripe](https://stripe.com) (gratis para desarrollo)
- Cuenta en [Resend](https://resend.com) (gratis hasta 3000 emails/mes)
- (Opcional) Cuenta en [Crisp](https://crisp.chat) para chat de soporte

---

## Paso 1: Instalar Dependencias

```bash
npm install
```

---

## Paso 2: Configurar Variables de Entorno

Copia el archivo `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Rellena cada variable (ver abajo como obtener cada una).

### Variables Requeridas

```bash
# Supabase - desde https://supabase.com/dashboard > Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe - desde https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend - desde https://resend.com/api-keys
RESEND_API_KEY=re_...
```

### Como Obtener Cada Variable

**Supabase:**
1. Ve a [supabase.com/dashboard](https://supabase.com/dashboard)
2. Crea un proyecto nuevo (o usa uno existente)
3. Ve a Settings > API
4. Copia `URL`, `anon key` y `service_role key`

**Stripe:**
1. Ve a [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
2. Copia la `Secret key` (empieza con `sk_test_` en modo test)
3. Para el webhook secret, ver Paso 5

**Resend:**
1. Ve a [resend.com/api-keys](https://resend.com/api-keys)
2. Crea una nueva API key
3. Copia la key (empieza con `re_`)

---

## Paso 3: Configurar Supabase

### Crear la Tabla `profiles`

En el SQL Editor de Supabase, ejecuta:

```sql
-- Tabla de perfiles de usuario
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  customer_id text,
  price_id text,
  has_access boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS (Row Level Security)
alter table public.profiles enable row level security;

-- Politica: los usuarios solo pueden ver su propio perfil
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Politica: los usuarios solo pueden actualizar su propio perfil
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger para crear perfil automaticamente al registrarse
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### Configurar Google OAuth en Supabase

1. Ve a Authentication > Providers > Google
2. Activa el provider
3. Agrega tu Client ID y Client Secret de Google Cloud Console
4. Configura la Redirect URL que Supabase te muestra en Google Cloud Console

### (Opcional) Tabla de Leads

Si quieres usar el componente `ButtonLead` para capturar emails:

```sql
create table public.leads (
  id bigint generated always as identity primary key,
  email text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

---

## Paso 4: Configurar Stripe

### Crear Productos y Precios

1. Ve a [dashboard.stripe.com/products](https://dashboard.stripe.com/products)
2. Crea tus productos con los precios que quieras
3. Copia los `priceId` de cada precio (formato `price_...`)
4. Actualizalos en `config.ts` dentro de `stripe.plans`

### Crear Webhook

1. Instala Stripe CLI: [stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)
2. Para desarrollo local:

```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

3. Copia el webhook secret que aparece (empieza con `whsec_`)
4. Ponlo en `STRIPE_WEBHOOK_SECRET` en `.env.local`

### Para Produccion

1. Ve a [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. Crea un endpoint apuntando a `https://tudominio.com/api/webhook/stripe`
3. Selecciona estos eventos:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copia el signing secret

---

## Paso 5: Personalizar config.ts

Abre `config.ts` y actualiza:

```typescript
const config = {
  appName: "TuApp",                    // Nombre de tu app
  appDescription: "Tu descripcion",     // Descripcion corta para SEO
  domainName: "tudominio.com",          // Sin https://, sin / al final

  // Planes de Stripe
  stripe: {
    plans: [
      {
        priceId: "price_tu_id_aqui",    // Tu priceId de Stripe
        name: "Starter",
        price: 29,
        // ...
      },
    ],
  },

  // Emails
  resend: {
    fromNoReply: "TuApp <noreply@tudominio.com>",
    fromAdmin: "Tu Nombre <nombre@tudominio.com>",
    supportEmail: "soporte@tudominio.com",
  },

  // Tema visual
  colors: {
    theme: "light",                     // o cualquier tema DaisyUI
    main: "#3b82f6",                    // Color principal (HEX)
  },
};
```

---

## Paso 6: Arrancar

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) y deberia estar tu landing page funcionando.

---

## Checklist de Lanzamiento

Antes de ir a produccion, verifica:

- [ ] Variables de entorno de produccion configuradas
- [ ] `priceId` de Stripe en modo live (no test)
- [ ] Webhook de Stripe apuntando a tu dominio
- [ ] Dominio configurado en Supabase Auth (Redirect URLs)
- [ ] Dominio verificado en Resend para emails
- [ ] `domainName` actualizado en `config.ts`
- [ ] Imagenes OG personalizadas (`app/opengraph-image.png`, `app/twitter-image.png`)
- [ ] Favicon personalizado (`app/icon.png`, `app/favicon.ico`)
- [ ] Textos de la landing page personalizados
- [ ] Politica de privacidad y terminos de servicio actualizados
- [ ] `next-sitemap.config.js` con tu dominio
- [ ] Google OAuth configurado con tu dominio de produccion
