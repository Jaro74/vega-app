# 04 - Autenticacion

Sistema de autenticacion basado en Supabase Auth con Google OAuth y Magic Links.

---

## Metodos de Login

### 1. Google OAuth

El usuario hace clic en "Sign-up with Google", se redirige a Google, autoriza, y vuelve a la app autenticado.

**Flujo:**
1. `app/signin/page.tsx` llama a `supabase.auth.signInWithOAuth({ provider: "google" })`
2. Supabase redirige al usuario a Google
3. Google redirige de vuelta a `/api/auth/callback`
4. La ruta intercambia el codigo por una sesion
5. Redirige a `config.auth.callbackUrl` (`/dashboard`)

### 2. Magic Links

El usuario introduce su email, recibe un enlace por correo, hace clic y queda autenticado.

**Flujo:**
1. `app/signin/page.tsx` llama a `supabase.auth.signInWithOtp({ email })`
2. Supabase envia un email con un enlace magico
3. El usuario hace clic en el enlace
4. Redirige a `/api/auth/callback`
5. La ruta intercambia el codigo por una sesion
6. Redirige a `/dashboard`

---

## Archivos Involucrados

| Archivo | Funcion |
|---------|---------|
| `app/signin/page.tsx` | Pagina de login (UI con formulario) |
| `app/signin/layout.tsx` | Layout de la pagina de login |
| `app/api/auth/callback/route.ts` | Procesa el callback de OAuth/Magic Link |
| `app/dashboard/layout.tsx` | Protege rutas privadas |
| `middleware.ts` | Refresca sesion en cada peticion |
| `libs/supabase/client.ts` | Cliente Supabase para browser |
| `libs/supabase/server.ts` | Cliente Supabase para servidor |
| `libs/supabase/middleware.ts` | Logica de refresco de sesion |
| `components/ButtonSignin.tsx` | Boton de login reutilizable |
| `components/ButtonAccount.tsx` | Menu de cuenta (logout) |

---

## Proteccion de Rutas

### Como Funciona

Las rutas privadas estan protegidas por `app/dashboard/layout.tsx`:

```typescript
export default async function LayoutPrivate({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(config.auth.loginUrl);
  }

  return <>{children}</>;
}
```

Cualquier pagina dentro de `app/dashboard/` hereda esta proteccion automaticamente.

### Agregar Mas Rutas Privadas

Para proteger otra seccion (ej: `/settings`), crea un layout similar:

```
app/settings/
  layout.tsx   # Copia la logica de proteccion de dashboard/layout.tsx
  page.tsx     # Tu pagina
```

---

## Middleware de Sesion

`middleware.ts` se ejecuta en **cada peticion** (excepto archivos estaticos) y refresca el token de autenticacion:

```typescript
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}
```

`libs/supabase/middleware.ts` contiene la logica:
1. Lee las cookies de la peticion
2. Crea un cliente Supabase con esas cookies
3. Llama a `supabase.auth.getUser()` para refrescar el token
4. Actualiza las cookies en la respuesta

Sin este middleware, las sesiones expirarian y los usuarios tendrian que volver a hacer login constantemente.

**Rutas excluidas del middleware:**
- `_next/static` (archivos estaticos de Next.js)
- `_next/image` (imagenes optimizadas)
- `favicon.ico`
- Archivos con extension: `.svg`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`

---

## Configuracion en Supabase

### Providers

En el dashboard de Supabase: **Authentication > Providers**

1. **Email**: Activado por defecto (para Magic Links)
2. **Google**: Necesita Client ID y Client Secret de Google Cloud Console

### Redirect URLs

En **Authentication > URL Configuration**, agrega:

```
# Desarrollo
http://localhost:3000/api/auth/callback

# Produccion
https://tudominio.com/api/auth/callback
```

### Site URL

Configura tu Site URL:

```
# Desarrollo
http://localhost:3000

# Produccion
https://tudominio.com
```

---

## Componentes de Auth

### ButtonSignin

Boton para iniciar sesion. Se usa en el Header y en CTAs.

```jsx
import ButtonSignin from "@/components/ButtonSignin";

<ButtonSignin />
// o con texto personalizado:
<ButtonSignin text="Empezar gratis" />
```

Comportamiento:
- Si el usuario NO esta logueado: redirige a `/signin`
- Si el usuario YA esta logueado: muestra su avatar y redirige a `callbackUrl`

### ButtonAccount

Menu de cuenta del usuario autenticado.

```jsx
import ButtonAccount from "@/components/ButtonAccount";

<ButtonAccount />
```

Opciones:
- **Billing**: Abre el portal de Stripe para gestionar facturacion
- **Logout**: Cierra sesion y redirige a la landing

Se oculta automaticamente si el usuario no esta logueado.

---

## Datos del Usuario

Despues del login, puedes acceder a los datos del usuario:

### En Server Components / API Routes

```typescript
import { createClient } from "@/libs/supabase/server";

const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

// user.id - UUID del usuario
// user.email - Email del usuario
```

### En Client Components

```typescript
import { createClient } from "@/libs/supabase/client";

const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();
```

### Perfil Completo (con datos de pago)

```typescript
const { data: profile } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", user.id)
  .single();

// profile.email
// profile.customer_id - ID de Stripe
// profile.price_id - Plan actual
// profile.has_access - Tiene acceso al producto?
```
