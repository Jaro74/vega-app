# 06 - Base de Datos (Supabase)

Supabase proporciona una base de datos PostgreSQL completa con autenticacion integrada.

---

## Tabla Principal: profiles

La tabla `profiles` almacena los datos de cada usuario y su estado de pago.

### Esquema

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `id` | uuid (PK) | ID del usuario (referencia a `auth.users`) |
| `email` | text | Email del usuario |
| `customer_id` | text | ID del cliente en Stripe (`cus_...`) |
| `price_id` | text | ID del plan activo (`price_...`) |
| `has_access` | boolean | Si tiene acceso al producto |
| `created_at` | timestamptz | Fecha de creacion |

### SQL de Creacion

```sql
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  customer_id text,
  price_id text,
  has_access boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);
```

### Trigger de Creacion Automatica

Cuando un usuario se registra, se crea automaticamente su perfil:

```sql
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

---

## Tabla Opcional: leads

Para capturar emails con `ButtonLead`.

```sql
create table public.leads (
  id bigint generated always as identity primary key,
  email text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

---

## Clientes de Supabase

La plantilla tiene 3 clientes de Supabase para diferentes contextos:

### 1. Cliente Browser (`libs/supabase/client.ts`)

Para componentes con `"use client"`.

```typescript
import { createClient } from "@/libs/supabase/client";

const supabase = createClient();  // Sin await
const { data } = await supabase.from("profiles").select("*");
```

### 2. Cliente Server (`libs/supabase/server.ts`)

Para Server Components y API Routes.

```typescript
import { createClient } from "@/libs/supabase/server";

const supabase = await createClient();  // Con await
const { data } = await supabase.from("profiles").select("*");
```

### 3. Cliente Middleware (`libs/supabase/middleware.ts`)

Solo para el middleware de refresco de sesion. No lo uses directamente.

### 4. Cliente Admin (en webhook)

El webhook de Stripe usa un cliente con `service_role` para poder crear usuarios y modificar cualquier perfil:

```typescript
const supabase = new SupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // Acceso total
);
```

---

## Operaciones Comunes

### Leer perfil del usuario actual

```typescript
// Server Component o API Route
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

const { data: profile } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", user.id)
  .single();
```

### Verificar si tiene acceso

```typescript
const { data: profile } = await supabase
  .from("profiles")
  .select("has_access")
  .eq("id", user.id)
  .single();

if (!profile?.has_access) {
  // Redirigir o mostrar paywall
}
```

### Actualizar perfil

```typescript
await supabase
  .from("profiles")
  .update({ has_access: true })
  .eq("id", user.id);
```

### Insertar un lead

```typescript
await supabase
  .from("leads")
  .insert({ email: "nuevo@email.com" });
```

---

## Row Level Security (RLS)

RLS esta activado en la tabla `profiles`. Las politicas definidas son:

1. **SELECT**: Un usuario solo puede leer su propio perfil (`auth.uid() = id`)
2. **UPDATE**: Un usuario solo puede actualizar su propio perfil (`auth.uid() = id`)

El webhook de Stripe usa `service_role` que bypasea RLS para poder actualizar cualquier perfil.

### Agregar Politicas para Nuevas Tablas

Siempre activa RLS en nuevas tablas:

```sql
alter table public.mi_tabla enable row level security;

-- Ejemplo: solo el dueno puede leer
create policy "Owner can read"
  on public.mi_tabla for select
  using (auth.uid() = user_id);

-- Ejemplo: solo el dueno puede insertar
create policy "Owner can insert"
  on public.mi_tabla for insert
  with check (auth.uid() = user_id);
```

---

## Variables de Entorno

```bash
# Publicas (accesibles desde el browser)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Privada (solo servidor - NUNCA exponer al browser)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

La `anon key` respeta RLS. La `service_role key` tiene acceso total y solo se usa en el servidor (webhook).

---

## Anadir Nuevas Tablas

1. Crea la tabla en el SQL Editor de Supabase
2. Activa RLS
3. Define politicas de acceso
4. Usa el cliente apropiado (server o client) para interactuar

Ejemplo completo:

```sql
-- 1. Crear tabla
create table public.projects (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

-- 2. Activar RLS
alter table public.projects enable row level security;

-- 3. Politicas
create policy "Users can CRUD own projects"
  on public.projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

```typescript
// 4. Usar desde el codigo
const supabase = await createClient();
const { data } = await supabase
  .from("projects")
  .select("*")
  .order("created_at", { ascending: false });
```
