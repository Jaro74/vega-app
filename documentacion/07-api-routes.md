# 07 - Rutas API

Referencia completa de todos los endpoints de la API.

---

## Resumen de Endpoints

| Metodo | Ruta | Autenticacion | Descripcion |
|--------|------|---------------|-------------|
| GET | `/api/auth/callback` | No | Callback de OAuth/Magic Link |
| POST | `/api/lead` | No | Captura de emails |
| POST | `/api/stripe/create-checkout` | Si | Crea sesion de checkout |
| POST | `/api/stripe/create-portal` | Si | Crea portal de facturacion |
| POST | `/api/webhook/stripe` | Firma Stripe | Procesa webhooks de Stripe |

---

## GET /api/auth/callback

Procesa el callback despues de que el usuario se autentica con Google OAuth o Magic Link.

**Archivo:** `app/api/auth/callback/route.ts`

**Flujo:**
1. Recibe el parametro `code` en la URL
2. Intercambia el codigo por una sesion de Supabase
3. Redirige a `config.auth.callbackUrl` (`/dashboard`)

**No requiere autenticacion.** Supabase maneja la verificacion del codigo.

---

## POST /api/lead

Captura emails de visitantes (waitlist, newsletter, etc.).

**Archivo:** `app/api/lead/route.ts`

**Request:**
```json
{
  "email": "usuario@ejemplo.com"
}
```

**Response exito (200):**
```json
{}
```

**Response error (400):**
```json
{
  "error": "El email es requerido"
}
```

**Notas:**
- No requiere autenticacion
- El guardado en base de datos esta comentado por defecto
- Para activarlo, descomenta las lineas de Supabase en el archivo
- Puedes agregar logica extra: enviar email de bienvenida, notificar al admin, etc.

**Componente relacionado:** `ButtonLead`

---

## POST /api/stripe/create-checkout

Crea una sesion de Stripe Checkout para que el usuario pague.

**Archivo:** `app/api/stripe/create-checkout/route.ts`

**Request:**
```json
{
  "priceId": "price_xxx",
  "mode": "payment",
  "successUrl": "https://miapp.com/dashboard",
  "cancelUrl": "https://miapp.com/"
}
```

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `priceId` | string | Si | ID del precio en Stripe |
| `mode` | string | Si | `"payment"` (unico) o `"subscription"` (recurrente) |
| `successUrl` | string | Si | URL de redireccion tras pago exitoso |
| `cancelUrl` | string | Si | URL si el usuario cancela |

**Response exito (200):**
```json
{
  "url": "https://checkout.stripe.com/c/pay/..."
}
```

**Errores posibles:**
- `400`: Falta priceId, mode, successUrl o cancelUrl
- `500`: Error interno de Stripe

**Requiere autenticacion.** El usuario debe estar logueado.

**Que hace internamente:**
1. Obtiene el usuario autenticado de Supabase
2. Busca su perfil (para obtener email y customer_id)
3. Crea la sesion de checkout con Stripe
4. Si ya tiene customer_id, prerellena la tarjeta
5. Retorna la URL de checkout

**Componente relacionado:** `ButtonCheckout`

---

## POST /api/stripe/create-portal

Crea una sesion del portal de facturacion de Stripe.

**Archivo:** `app/api/stripe/create-portal/route.ts`

**Request:**
```json
{
  "returnUrl": "https://miapp.com/dashboard"
}
```

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `returnUrl` | string | Si | URL a donde volver despues del portal |

**Response exito (200):**
```json
{
  "url": "https://billing.stripe.com/p/session/..."
}
```

**Errores posibles:**
- `400`: Falta returnUrl o el usuario no tiene customer_id
- `401`: Usuario no autenticado
- `500`: Error interno

**Requiere autenticacion + haber pagado al menos una vez** (tener `customer_id`).

**Componente relacionado:** `ButtonAccount` (opcion "Billing")

---

## POST /api/webhook/stripe

Recibe y procesa eventos enviados por Stripe.

**Archivo:** `app/api/webhook/stripe/route.ts`

**No se llama manualmente.** Stripe envía eventos aqui automaticamente.

### Verificacion de Seguridad

Cada peticion se verifica con la firma de Stripe:

```typescript
event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
```

Si la firma no coincide, retorna `400`.

### Eventos Procesados

#### checkout.session.completed

Se dispara cuando un usuario completa un pago.

**Acciones:**
1. Obtiene los detalles de la sesion
2. Identifica al usuario por `client_reference_id` o email
3. Si no existe el usuario, lo crea con `supabase.auth.admin.createUser()`
4. Actualiza el perfil:
   - `customer_id` = ID de Stripe
   - `price_id` = Plan comprado
   - `has_access` = true

#### checkout.session.expired

No hace nada. El usuario no completo el pago.

#### customer.subscription.updated

No hace nada por defecto. Se puede usar para mostrar "Se cancelara pronto".

#### customer.subscription.deleted

La suscripcion se cancelo definitivamente.

**Accion:** `has_access` = false para ese `customer_id`.

#### invoice.paid

Pago recurrente exitoso (suscripcion mensual/anual).

**Accion:** `has_access` = true para ese `customer_id`.

#### invoice.payment_failed

Pago fallido. No hace nada porque Stripe reintenta automaticamente (Smart Retries). Si todos los reintentos fallan, se dispara `customer.subscription.deleted`.

---

## Cliente API (libs/api.ts)

Para llamar a los endpoints desde componentes client, usa el cliente preconfigurado:

```typescript
import apiClient from "@/libs/api";

// POST /api/stripe/create-checkout
const { data } = await apiClient.post("/stripe/create-checkout", {
  priceId: "price_xxx",
  mode: "payment",
  successUrl: window.location.href,
  cancelUrl: window.location.href,
});

// Redirigir a Stripe
window.location.href = data.url;
```

### Manejo Automatico de Errores

El cliente API intercepta las respuestas y:
- **401**: Muestra "Por favor inicia sesion" y redirige a login
- **403**: Muestra "Elige un plan para usar esta funcion"
- **Otros errores**: Muestra el mensaje de error como toast

No necesitas manejar errores manualmente en la mayoria de los casos.

---

## Agregar Nuevas Rutas API

Para crear una nueva ruta API:

1. Crea el archivo en `app/api/tu-ruta/route.ts`
2. Exporta las funciones HTTP que necesites (GET, POST, PUT, DELETE)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    const body = await req.json();

    // Tu logica aqui...

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message },
      { status: 500 }
    );
  }
}
```
