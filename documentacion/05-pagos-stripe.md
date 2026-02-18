# 05 - Pagos con Stripe

Sistema completo de pagos y suscripciones con Stripe.

---

## Resumen

La plantilla soporta dos modos de pago:
- **`payment`**: Pago unico (el usuario paga una vez)
- **`subscription`**: Suscripcion recurrente (el usuario paga cada mes/ano)

---

## Archivos Involucrados

| Archivo | Funcion |
|---------|---------|
| `config.ts` | Define planes y precios |
| `libs/stripe.ts` | Funciones de Stripe (checkout, portal, sesion) |
| `components/ButtonCheckout.tsx` | Boton que inicia el pago |
| `components/Pricing.tsx` | Tabla de precios |
| `components/ButtonAccount.tsx` | Acceso al portal de facturacion |
| `app/api/stripe/create-checkout/route.ts` | Crea sesion de checkout |
| `app/api/stripe/create-portal/route.ts` | Crea sesion del portal |
| `app/api/webhook/stripe/route.ts` | Procesa eventos de Stripe |

---

## Flujo Completo de Pago

```
1. Usuario ve la tabla de precios (Pricing)
2. Hace clic en un plan (ButtonCheckout)
3. Frontend llama a POST /api/stripe/create-checkout
4. Backend crea una Stripe Checkout Session
5. Usuario es redirigido a la pagina de pago de Stripe
6. Completa el pago
7. Stripe envia webhook a POST /api/webhook/stripe
8. Backend actualiza profiles.has_access = true
9. Usuario vuelve a la app con acceso
```

---

## Configurar Planes

En `config.ts`:

```typescript
stripe: {
  plans: [
    {
      priceId:
        process.env.NODE_ENV === "development"
          ? "price_test_xxx"    // Modo test
          : "price_live_xxx",   // Modo produccion
      name: "Starter",
      description: "Ideal para empezar",
      price: 29,
      priceAnchor: 49,          // Precio anterior (tachado)
      features: [
        { name: "Feature 1" },
        { name: "Feature 2" },
      ],
    },
    {
      priceId: "price_...",
      isFeatured: true,         // Plan destacado
      name: "Pro",
      price: 79,
      features: [
        { name: "Todo de Starter" },
        { name: "Feature Pro 1" },
      ],
    },
  ],
},
```

---

## Funciones de Stripe (libs/stripe.ts)

### createCheckout()

Crea una sesion de Stripe Checkout.

```typescript
const url = await createCheckout({
  priceId: "price_xxx",
  mode: "payment",              // o "subscription"
  successUrl: "https://...",
  cancelUrl: "https://...",
  clientReferenceId: user.id,   // Para identificar al usuario en el webhook
  user: {
    email: "user@email.com",
    customerId: "cus_xxx",      // Si ya tiene cuenta en Stripe
  },
});
```

Caracteristicas:
- Prerellena email del usuario
- Prerellena tarjeta si ya ha pagado antes
- Soporta codigos promocionales (`allow_promotion_codes: true`)
- Soporta cupones (`couponId`)
- Habilita recoleccion de Tax ID

### createCustomerPortal()

Crea una sesion del portal de facturacion de Stripe donde el usuario puede:
- Ver facturas
- Actualizar metodo de pago
- Cancelar suscripcion

```typescript
const url = await createCustomerPortal({
  customerId: "cus_xxx",
  returnUrl: "https://miapp.com/dashboard",
});
```

### findCheckoutSession()

Obtiene los detalles de una sesion de checkout (usado internamente por el webhook).

```typescript
const session = await findCheckoutSession("cs_xxx");
// session.customer - ID del cliente
// session.line_items - Productos comprados
```

---

## Webhook de Stripe

### Eventos Manejados

| Evento | Accion |
|--------|--------|
| `checkout.session.completed` | Concede acceso al producto |
| `checkout.session.expired` | No hace nada (sesion expirada sin pago) |
| `customer.subscription.updated` | No hace nada (Stripe avisara cuando se cancele) |
| `customer.subscription.deleted` | Revoca acceso al producto |
| `invoice.paid` | Concede acceso (pago recurrente exitoso) |
| `invoice.payment_failed` | Espera reintentos automaticos de Stripe |

### checkout.session.completed (detalle)

Cuando un pago se completa:
1. Obtiene la sesion y el `priceId`
2. Busca al usuario por `client_reference_id` o email
3. Si no existe, crea un usuario nuevo con `supabase.auth.admin.createUser()`
4. Actualiza el perfil:
   - `customer_id` = ID del cliente en Stripe
   - `price_id` = Plan que compro
   - `has_access` = true

### customer.subscription.deleted

Cuando una suscripcion se cancela:
1. Obtiene el `customer` de la suscripcion
2. Actualiza `has_access = false` en el perfil con ese `customer_id`

---

## API Routes

### POST /api/stripe/create-checkout

Crea una sesion de checkout.

**Request:**
```json
{
  "priceId": "price_xxx",
  "mode": "payment",
  "successUrl": "https://miapp.com/dashboard",
  "cancelUrl": "https://miapp.com/"
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

**Requisitos:** Usuario autenticado.

### POST /api/stripe/create-portal

Crea una sesion del portal de facturacion.

**Request:**
```json
{
  "returnUrl": "https://miapp.com/dashboard"
}
```

**Response:**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

**Requisitos:** Usuario autenticado + tener `customer_id`.

### POST /api/webhook/stripe

Recibe eventos de Stripe. No se llama manualmente.

**Requisitos:** Header `stripe-signature` valido.

---

## Desarrollo Local

Para probar webhooks en local, usa Stripe CLI:

```bash
# Instalar Stripe CLI
# macOS: brew install stripe/stripe-cli/stripe
# Windows: scoop install stripe

# Escuchar eventos y reenviar a local
stripe listen --forward-to localhost:3000/api/webhook/stripe

# Copia el webhook secret que aparece y ponlo en .env.local
STRIPE_WEBHOOK_SECRET=whsec_...
```

Para hacer un pago de prueba, usa la tarjeta: `4242 4242 4242 4242` con cualquier fecha futura y CVC.

---

## Verificar Acceso del Usuario

En cualquier parte del codigo:

```typescript
const { data: profile } = await supabase
  .from("profiles")
  .select("has_access")
  .eq("id", user.id)
  .single();

if (profile?.has_access) {
  // El usuario ha pagado
} else {
  // El usuario no ha pagado
}
```
