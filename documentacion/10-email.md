# 10 - Email (Resend)

Sistema de envio de emails transaccionales con Resend.

---

## Archivos Involucrados

| Archivo | Funcion |
|---------|---------|
| `libs/resend.ts` | Funcion helper `sendEmail()` |
| `config.ts` | Configuracion de remitentes |

---

## Configuracion

### Variables de Entorno

```bash
RESEND_API_KEY=re_...
```

Obtener en: [resend.com/api-keys](https://resend.com/api-keys)

### Remitentes en config.ts

```typescript
resend: {
  // Para magic links y emails del sistema
  fromNoReply: "MiApp <noreply@miapp.com>",

  // Para emails administrativos (bienvenida, notificaciones, etc.)
  fromAdmin: "Ana de MiApp <ana@miapp.com>",

  // Email de soporte (usado si Crisp no esta configurado)
  supportEmail: "soporte@miapp.com",
},
```

### Verificar Dominio

Para usar un dominio personalizado como remitente (no `@resend.dev`):

1. Ve a [resend.com/domains](https://resend.com/domains)
2. Agrega tu dominio
3. Configura los registros DNS (SPF, DKIM, DMARC)
4. Espera la verificacion

Mientras tanto, puedes usar `tu-nombre@resend.dev` para pruebas.

---

## Funcion sendEmail()

### Firma

```typescript
sendEmail({
  to: string | string[],
  subject: string,
  text: string,
  html: string,
  replyTo?: string | string[],
}): Promise<{ id: string }>
```

### Uso

```typescript
import { sendEmail } from "@/libs/resend";

await sendEmail({
  to: "usuario@ejemplo.com",
  subject: "Bienvenido a MiApp",
  text: "Gracias por registrarte en MiApp.",
  html: "<h1>Bienvenido</h1><p>Gracias por registrarte.</p>",
  replyTo: "soporte@miapp.com",
});
```

### Enviar a Multiples Destinatarios

```typescript
await sendEmail({
  to: ["usuario1@ejemplo.com", "usuario2@ejemplo.com"],
  subject: "Novedad",
  text: "Hay una nueva funcion disponible.",
  html: "<p>Hay una nueva funcion disponible.</p>",
});
```

### Manejo de Errores

La funcion lanza un error si el envio falla:

```typescript
try {
  await sendEmail({ ... });
} catch (error) {
  console.error("Error enviando email:", error.message);
}
```

---

## Casos de Uso Comunes

### Email de Bienvenida (post-pago)

En `app/api/webhook/stripe/route.ts`, despues de `checkout.session.completed`:

```typescript
// Descomenta y personaliza este bloque en el webhook
try {
  await sendEmail({
    to: customer.email,
    subject: "Bienvenido a MiApp",
    text: "Tu cuenta esta lista.",
    html: `
      <h1>Bienvenido!</h1>
      <p>Tu cuenta ya esta activa. Accede aqui:</p>
      <a href="https://miapp.com/dashboard">Ir al Dashboard</a>
    `,
  });
} catch (e) {
  console.error("Error enviando email:", e?.message);
}
```

### Notificacion al Admin (nuevo lead)

En `app/api/lead/route.ts`:

```typescript
await sendEmail({
  to: config.resend.supportEmail,
  subject: "Nuevo lead capturado",
  text: `Nuevo email: ${body.email}`,
  html: `<p>Nuevo lead: <strong>${body.email}</strong></p>`,
});
```

### Email de Confirmacion

```typescript
await sendEmail({
  to: user.email,
  subject: "Confirma tu accion",
  text: "Haz clic en el enlace para confirmar.",
  html: `
    <p>Haz clic para confirmar:</p>
    <a href="https://miapp.com/confirm?token=xxx">Confirmar</a>
  `,
});
```

---

## Limitaciones

- **Plan gratuito de Resend**: 3,000 emails/mes, 100 emails/dia
- **Rate limit**: Depende del plan
- **Tamano maximo**: 40KB por email (texto + HTML)

---

## Magic Links

Los Magic Links de Supabase Auth se envian automaticamente por Supabase, no por Resend. El remitente se configura en el dashboard de Supabase:

**Authentication > Email Templates**

Puedes personalizar el diseno del email de magic link desde ahi.
